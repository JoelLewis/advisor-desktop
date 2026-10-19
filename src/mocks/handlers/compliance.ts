import { http, HttpResponse } from 'msw'
import type { ComplianceAlert, SupervisionRecord } from '@/types/compliance'
import { todayISO } from '@/lib/clock'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import { accounts } from '../data/accounts'
import { cashBalanceOf, getPositionsForAccount } from '../data/positions'
import { personById } from '../data/people'
import { openWashSaleWindowsFor } from './tax-return'
import { refuseExternal } from './workspace-http'
import type { ProposalTradeLeg, ProposalViolation, ProposalLegResult, PreTradeCheckProposalResult, WorkingOrderRef } from '@/services/oms'
import type { AssetClass } from '@/types/portfolio'

/**
 * Pre-trade compliance / conflicts of interest — one list, used by both the trade ticket
 * (oms.ts) and the pre-trade engine below. They previously kept separate lists that disagreed:
 * this one omitted the ticket's BBBY, and the ticket omitted every name here except GME and AMC.
 *
 * The rationales were a broker-dealer's, not an RIA's. "Investment banking relationship" is a
 * sell-side construct — an RIA has no underwriting book. A registered adviser's restricted list is
 * driven by material non-public information, access-person reportable holdings, and firm-wide
 * restrictions. BBBY is also gone: it was delisted in 2023, so no adviser's live restricted list
 * would still carry it.
 */
const RESTRICTED_SECURITIES = new Set([
  'META', 'GOOG', 'GOOGL', // Access person holds a reportable position
  'COIN',                  // Material non-public information — engagement in progress
  'GME', 'AMC',            // Firm-wide restriction — heightened volatility designation
])

// ── Concentration limits ──
// Per-kind limits (single-issuer / fund / cash), imported from the one
// place they are defined (`security-master.ts`), not a blanket 10% restated here.
// Exported so `oms.ts`'s pre-check handler reads the same 2% floor, rather than a second literal.
const CASH_MINIMUM_PCT = 0.02       // 2% cash minimum

/** Pooled/individual tech names used by the sector-concentration check. Shared with `oms.ts`'s single-order check. */
const TECH_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA']
const SECTOR_LIMIT = 0.40
/** Every weight rule warns at 80% of its limit and can block above the limit itself. */
const WARN_AT = 0.8

const pct = (weight: number) => `${(weight * 100).toFixed(1)}%`
const pct0 = (weight: number) => `${(weight * 100).toFixed(0)}%`

/**
 * Proposal-level pre-trade compliance — the one engine behind `/api/oms/orders/pre-check-proposal`
 * and the Rebalance flow's `/api/compliance/check-trades`.
 *
 * Every leg is applied to one projected portfolio before any rule runs: sells settle first, then
 * buys are paid for, so end cash = current cash + sell proceeds − buy cost. A sale moves value into
 * cash inside the same account, so the account total — the denominator of every weight — does not
 * change, and a position no leg trades keeps its current weight.
 *
 * Rules run in parallel (all violations reported, not the first): restricted list, concentration
 * per security kind (`concentrationLimitFor`), technology sector, 2% cash floor, wash-sale window.
 * A weight rule blocks only when the proposal moves the weight UP and ends above the limit. A
 * proposal that reduces an over-limit weight, or leaves it alone, gets a warning that the limit
 * remains breached — the trade that moves toward the limit is not what breaks it.
 *
 * Each violation names the legs behind it (`legs`, indexes into `trades`): the legs that raise
 * the weight, or, for a reduced breach, the legs that reduce it. A breach no leg touches names none.
 */
export function evaluateProposal(
  accountId: string,
  trades: readonly ProposalTradeLeg[],
  working: readonly (WorkingOrderRef & { estimatedValue: number; assetClass: AssetClass })[] = [],
): PreTradeCheckProposalResult | undefined {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return undefined
  const accountValue = account.totalValue
  const violations: ProposalViolation[] = []

  // ── Projection ──
  const held = new Map<string, { value: number; assetClass: string }>()
  for (const p of getPositionsForAccount(account.id, accountValue)) {
    if (securityKind(p.symbol, p.assetClass) === 'cash') continue
    held.set(p.symbol, { value: p.marketValue, assetClass: p.assetClass })
  }
  // Working orders are counted as filled: they are the book the proposal starts from, never one of its legs.
  for (const w of working) {
    const was = held.get(w.symbol)
    const signed = w.side === 'buy' ? w.estimatedValue : -w.estimatedValue
    held.set(w.symbol, { value: Math.max(0, (was?.value ?? 0) + signed), assetClass: was?.assetClass ?? w.assetClass })
  }
  const projected = new Map<string, number>([...held].map(([symbol, h]) => [symbol, h.value]))
  const legsOn = new Map<string, number[]>()
  trades.forEach((t, i) => {
    const signed = t.side === 'buy' ? t.estimatedValue : -t.estimatedValue
    projected.set(t.symbol, (projected.get(t.symbol) ?? 0) + signed)
    legsOn.set(t.symbol, [...(legsOn.get(t.symbol) ?? []), i])
  })
  // A sale larger than the holding cannot leave a negative position (long-only).
  const after = (symbol: string) => Math.max(0, projected.get(symbol) ?? 0)
  const before = (symbol: string) => held.get(symbol)?.value ?? 0
  // Legs on the side that moved the weight: buys when it rose, sells when it fell.
  const movers = (indexes: readonly number[], rose: boolean) =>
    indexes.filter((i) => (trades[i]!.side === 'buy') === rose)

  // ── Restricted securities — one list. Blocks any leg, buy or sell. ──
  trades.forEach((t, i) => {
    if (!RESTRICTED_SECURITIES.has(t.symbol)) return
    violations.push({
      category: 'restricted_securities',
      constraint: 'Restricted securities list',
      severity: 'block',
      currentValue: t.symbol,
      limit: 'Not permitted',
      message: `${t.symbol} is on the firm restricted securities list. Trading is prohibited.`,
      legs: [i],
      preExisting: false,
      symbol: t.symbol,
    })
  })

  // ── Concentration per security kind, over the whole end state ──
  for (const symbol of projected.keys()) {
    const assetClass = held.get(symbol)?.assetClass ?? 'us_equity'
    const kind = securityKind(symbol, assetClass)
    const limit = concentrationLimitFor(kind)
    const currentWeight = before(symbol) / accountValue
    const projectedWeight = after(symbol) / accountValue
    if (projectedWeight <= limit * WARN_AT) continue
    const rose = after(symbol) > before(symbol)
    const fell = after(symbol) < before(symbol)
    const overLimit = projectedWeight > limit
    const preExisting = currentWeight > limit
    const kindLabel = kind === 'single_name' ? 'single-issuer' : 'single-fund'
    let message: string
    if (overLimit && rose && preExisting) {
      message = `${symbol} is already ${pct(currentWeight)} of this account, over the ${pct0(limit)} ${kindLabel} limit; this proposal adds to it, taking it to ${pct(projectedWeight)}.`
    } else if (overLimit && rose) {
      message = `${symbol} would be ${pct(projectedWeight)} of this account after this proposal, over the ${pct0(limit)} ${kindLabel} limit.`
    } else if (overLimit && fell) {
      message = `${symbol} remains above the ${pct0(limit)} ${kindLabel} limit after this proposal: ${pct(currentWeight)} now, ${pct(projectedWeight)} after. The proposal reduces the breach; it does not cause it.`
    } else if (overLimit) {
      message = `${symbol} is already ${pct(currentWeight)} of this account and remains above the ${pct0(limit)} ${kindLabel} limit; no leg of this proposal trades it.`
    } else if (preExisting) {
      message = `${symbol} is over the ${pct0(limit)} ${kindLabel} limit today at ${pct(currentWeight)} of this account; this proposal brings it under, to ${pct(projectedWeight)}.`
    } else {
      message = `${symbol} would be ${pct(projectedWeight)} of this account after this proposal, approaching the ${pct0(limit)} ${kindLabel} limit.`
    }
    violations.push({
      category: 'concentration_limit',
      constraint: kind === 'single_name' ? 'Single-issuer concentration limit' : 'Single-fund concentration limit',
      severity: overLimit && rose ? 'block' : 'warning',
      currentValue: pct(projectedWeight),
      limit: pct(limit),
      message,
      legs: rose || fell ? movers(legsOn.get(symbol) ?? [], rose) : [],
      preExisting,
      symbol,
      currentWeight,
      projectedWeight,
      limitWeight: limit,
    })
  }

  // ── Technology sector, over the end state ──
  const techHeld = TECH_SYMBOLS.reduce((sum, s) => sum + before(s), 0)
  const techAfter = TECH_SYMBOLS.reduce((sum, s) => sum + after(s), 0)
  const techNow = techHeld / accountValue
  const techProjected = techAfter / accountValue
  if (techProjected > SECTOR_LIMIT * WARN_AT) {
    const rose = techAfter > techHeld
    const fell = techAfter < techHeld
    const overLimit = techProjected > SECTOR_LIMIT
    const techLegs = trades.flatMap((t, i) => (TECH_SYMBOLS.includes(t.symbol) ? [i] : []))
    violations.push({
      category: 'sector_limit',
      constraint: 'Sector concentration (Technology)',
      severity: overLimit && rose ? 'block' : 'warning',
      currentValue: pct(techProjected),
      limit: pct(SECTOR_LIMIT),
      message: overLimit && !rose
        ? `Technology remains above the ${pct0(SECTOR_LIMIT)} sector limit after this proposal: ${pct(techNow)} now, ${pct(techProjected)} after.`
        : `Technology sector allocation would be ${pct(techProjected)} after this proposal (currently ${pct(techNow)}), against a ${pct0(SECTOR_LIMIT)} limit.`,
      legs: rose || fell ? movers(techLegs, rose) : [],
      preExisting: techNow > SECTOR_LIMIT,
      currentWeight: techNow,
      projectedWeight: techProjected,
      limitWeight: SECTOR_LIMIT,
    })
  }

  // ── A leg on a security a working order already trades: the proposal counts the order; a second order is the advisor's call ──
  for (const w of working) {
    const on = trades.flatMap((t, i) => (t.symbol === w.symbol ? [i] : []))
    if (on.length === 0) continue
    violations.push({
      category: 'working_order', constraint: 'Working order on the same security', severity: 'warning',
      currentValue: `${w.side} ${w.quantity}`, limit: 'One open order per security',
      message: `A working order to ${w.side} ${w.quantity} ${w.symbol} (${w.orderId}) is already open in this account; this proposal also trades ${w.symbol}.`,
      legs: on, preExisting: true, symbol: w.symbol, workingOrder: { orderId: w.orderId, symbol: w.symbol, side: w.side, quantity: w.quantity },
    })
  }

  // ── Cash: sells settle first, then buys draw down in proposal order ──
  const startingCash = cashBalanceOf(account) - working.reduce((s, w) => s + (w.side === 'buy' ? w.estimatedValue : -w.estimatedValue), 0)
  const minimumCash = accountValue * CASH_MINIMUM_PCT
  const sellProceeds = trades.reduce((sum, t) => sum + (t.side === 'sell' ? t.estimatedValue : 0), 0)
  let cash = startingCash + sellProceeds
  const crossing: number[] = []
  trades.forEach((t, i) => {
    if (t.side !== 'buy') return
    cash -= t.estimatedValue
    if (cash < minimumCash) crossing.push(i)
  })
  const projectedCash = cash
  const projectedCashPct = projectedCash / accountValue
  if (projectedCash < minimumCash) {
    violations.push({
      category: 'cash_minimum',
      constraint: 'Cash reserve minimum (2%)',
      severity: projectedCash < 0 ? 'block' : 'warning',
      currentValue: pct(projectedCashPct),
      limit: pct(CASH_MINIMUM_PCT),
      message: `Cash after this proposal would be ${pct(projectedCashPct)} of the account, below the ${pct0(CASH_MINIMUM_PCT)} minimum reserve.`,
      legs: crossing,
      preExisting: startingCash < minimumCash,
      currentWeight: startingCash / accountValue,
      projectedWeight: projectedCashPct,
      limitWeight: CASH_MINIMUM_PCT,
    })
  }
  // Cash's own concentration limit (15%), on projected cash.
  const cashLimit = concentrationLimitFor('cash')
  const cashNow = startingCash / accountValue
  if (projectedCashPct > cashLimit * WARN_AT) {
    const rose = projectedCash > startingCash
    const fell = projectedCash < startingCash
    const overLimit = projectedCashPct > cashLimit
    violations.push({
      category: 'concentration_limit',
      constraint: 'Cash concentration limit',
      severity: overLimit && rose ? 'block' : 'warning',
      currentValue: pct(projectedCashPct),
      limit: pct(cashLimit),
      message: overLimit && !rose
        ? `Cash remains above the ${pct0(cashLimit)} cash limit after this proposal: ${pct(cashNow)} now, ${pct(projectedCashPct)} after.`
        : `Cash would be ${pct(projectedCashPct)} of this account after this proposal, ${overLimit ? 'over' : 'approaching'} the ${pct0(cashLimit)} cash limit.`,
      // Sells raise cash; buys lower it.
      legs: rose || fell ? trades.flatMap((t, i) => ((t.side === 'sell') === rose ? [i] : [])) : [],
      preExisting: cashNow > cashLimit,
      symbol: 'CASH',
      currentWeight: cashNow,
      projectedWeight: projectedCashPct,
      limitWeight: cashLimit,
    })
  }

  // ── Wash sale — the wash-sale taxpayer's 61-day windows. Buys only. ──
  const openWindows = openWashSaleWindowsFor(account, todayISO())
  trades.forEach((t, i) => {
    if (t.side !== 'buy') return
    const window = openWindows.find((w) => w.symbol === t.symbol)
    if (!window) return
    violations.push({
      category: 'wash_sale',
      constraint: 'Wash sale rule (61-day window)',
      severity: 'warning',
      currentValue: `Sold at a loss ${window.saleDate}`,
      limit: '61-day window',
      message: `${t.symbol} was sold at a loss by this account's taxpayer (owner or spouse) on ${window.saleDate}. Repurchasing on or before ${window.end} may trigger a wash sale, disallowing the loss.`,
      legs: [i],
      preExisting: false,
      symbol: t.symbol,
    })
  })

  const legs: ProposalLegResult[] = trades.map((t, index) => {
    const own = violations.filter((v) => v.legs.includes(index))
    const severity = own.some((v) => v.severity === 'block') ? 'block' : own.length > 0 ? 'warning' : 'pass'
    return { index, symbol: t.symbol, side: t.side, severity }
  })

  return {
    accountId,
    passed: violations.every((v) => v.severity !== 'block'),
    violations,
    legs,
    projectedCash,
    projectedCashPct,
    minimumCash,
  }
}

/** HTTP 400 text for a malformed proposal, or undefined when it is well-formed. */
export function invalidProposal(trades: unknown): string | undefined {
  if (!Array.isArray(trades)) return 'trades must be an array of legs'
  for (const t of trades as ProposalTradeLeg[]) {
    if (t.side !== 'buy' && t.side !== 'sell') return `leg ${t.symbol}: side must be buy or sell`
    // Notional is required and positive on every leg, as on the single-order check.
    if (typeof t.estimatedValue !== 'number' || !Number.isFinite(t.estimatedValue) || t.estimatedValue <= 0) {
      return `leg ${t.symbol}: estimatedValue (notional) must be a positive number`
    }
  }
  return undefined
}

// Exported so Supervision and the workspace alerts read these same records, never a second copy.
export const complianceAlerts: ComplianceAlert[] = [
  { id: 'comp-001', type: 'Large Wire', severity: 'critical', title: 'Large wire deposit — source-of-funds required', description: '$250,000 incoming wire to Richard Anderson (acc-022). BSA/AML documentation required before funds release.', entityType: 'account', entityId: 'acc-022', reviewStatus: 'pending', createdAt: '2026-02-24T15:10:00Z' },
  { id: 'comp-002', type: 'Concentration', severity: 'warning', title: 'Single-name concentration — MSFT in Johnson Trust', description: 'MSFT position at 9.2% of account value, above the 9% watch level and approaching the 10% single-name guideline.', entityType: 'account', entityId: 'acc-001', reviewStatus: 'in_review', createdAt: '2026-02-23T13:00:00Z' },
  { id: 'comp-003', type: 'Suitability', severity: 'warning', title: 'Suitability review — Foster profile update', description: 'William Foster updated his investor profile. Risk tolerance assessment and investment experience verification needed before the profile is filed.', entityType: 'client', entityId: 'cli-017', reviewStatus: 'in_review', createdAt: '2026-02-20T22:00:00Z' },
  { id: 'comp-004', type: 'Trade Pre-clearance', severity: 'info', title: 'Pre-trade compliance check passed — Martinez rebalance', description: 'All proposed trades for Michael Martinez rebalance cleared compliance screening.', entityType: 'trade', entityId: 'acc-015', reviewStatus: 'approved', createdAt: '2026-02-20T19:30:00Z', resolvedAt: '2026-02-20T19:35:00Z' },
  { id: 'comp-005', type: 'Document Expiry', severity: 'warning', title: 'IPS approaching annual review — Thompson', description: 'James Thompson IPS last reviewed Oct 2025. Annual review due by Oct 2026.', entityType: 'document', entityId: 'doc-014', reviewStatus: 'pending', createdAt: '2026-02-20T13:00:00Z' },
  { id: 'comp-006', type: 'Wash Sale', severity: 'info', title: 'Potential wash sale cleared — Johnson INTC/SMH', description: 'INTC sold at a loss and replaced with SMH. SMH, a semiconductor ETF, is not substantially identical to INTC, a single stock: no wash sale.', entityType: 'trade', entityId: 'acc-002', reviewStatus: 'approved', createdAt: '2026-02-20T16:00:00Z', resolvedAt: '2026-02-20T16:10:00Z' },
  { id: 'comp-007', type: 'RMD', severity: 'warning', title: 'RMD calculation needed — Thompson Traditional IRA', description: 'James Thompson turns 73 this year. First RMD from Traditional IRA (acc-020) must be calculated.', entityType: 'account', entityId: 'acc-020', reviewStatus: 'pending', createdAt: '2026-02-02T13:00:00Z' },
]

/**
 * The chief compliance officer, the supervisory principal who disposes of these alerts.
 * Records carry his directory id; the display label is read from the directory, not re-typed.
 */
const CCO_ID = 'cco-001'
const ccoReviewer = { reviewerId: CCO_ID, reviewer: `${personById(CCO_ID)!.name} (CCO)` }

export const SUPERVISION_RECORDS: readonly SupervisionRecord[] = [
  { id: 'sr-001', alertId: 'comp-004', ...ccoReviewer, action: 'Approved', notes: 'All trades within portfolio guidelines. No restricted securities.', timestamp: '2026-02-20T19:35:00Z' },
  { id: 'sr-002', alertId: 'comp-006', ...ccoReviewer, action: 'Approved', notes: 'SMH, a semiconductor ETF, is not substantially identical to INTC. No wash sale concern.', timestamp: '2026-02-20T16:10:00Z' },
  { id: 'sr-003', alertId: 'comp-002', ...ccoReviewer, action: 'Under Review', notes: 'Reviewing client IPS for MSFT exception. Position is long-held with significant unrealized gain.', timestamp: '2026-02-23T15:00:00Z' },
]

export const complianceHandlers = [
  http.get('/api/compliance/alerts', ({ request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const url = new URL(request.url)
    const severity = url.searchParams.get('severity')
    const status = url.searchParams.get('status')
    let filtered = [...complianceAlerts]
    if (severity) filtered = filtered.filter((a) => a.severity === severity)
    if (status) filtered = filtered.filter((a) => a.reviewStatus === status)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/compliance/alerts/:alertId/records', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const records = SUPERVISION_RECORDS.filter((r) => r.alertId === params.alertId)
    return HttpResponse.json(records)
  }),
]
