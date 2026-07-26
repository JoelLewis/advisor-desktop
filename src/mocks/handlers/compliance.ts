import { http, HttpResponse } from 'msw'
import type { ComplianceAlert, SupervisionRecord, TradeComplianceRequest, TradeComplianceCheck, TradeComplianceResult } from '@/types/compliance'
import { todayISO } from '@/lib/clock'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'

/**
 * D29 · pre-trade compliance / conflicts of interest — one list, used by both the trade ticket
 * (oms.ts) and the pre-trade engine below. They previously kept separate lists that disagreed:
 * this one omitted the ticket's BBBY, and the ticket omitted every name here except GME and AMC.
 *
 * The rationales were a broker-dealer's, not an RIA's. "Investment banking relationship" is a
 * sell-side construct — an RIA has no underwriting book. A registered adviser's restricted list is
 * driven by material non-public information, access-person reportable holdings, and firm-wide
 * restrictions. BBBY is also gone: it was delisted in 2023, so no adviser's live restricted list
 * would still carry it.
 */
export const RESTRICTED_SECURITIES = new Set([
  'META', 'GOOG', 'GOOGL', // Access person holds a reportable position
  'COIN',                  // Material non-public information — engagement in progress
  'GME', 'AMC',            // Firm-wide restriction — heightened volatility designation
])

// ── Concentration limits ──
// C23 · diversification — per-kind limits (single-issuer / fund / cash), imported from the one
// place they are defined (`security-master.ts`), not a blanket 10% restated here.
// Exported so `oms.ts`'s pre-check handler reads the same 2% floor, rather than a second literal.
export const CASH_MINIMUM_PCT = 0.02       // 2% cash minimum

// ── Account data derived from accounts.ts for compliance checks ──
// Values must match the canonical account data
import { accounts } from '../data/accounts'
import { openWashSaleWindows } from '../data/realised-sales'
import { getPositionsForAccount } from '../data/positions'

const ACCOUNT_VALUES: Record<string, number> = Object.fromEntries(
  accounts.map((a) => [a.id, a.totalValue])
)
const ACCOUNT_CASH: Record<string, number> = Object.fromEntries(
  accounts.map((a) => [a.id, a.cashBalance])
)

// C11 · pre-trade-compliance — existing position weight (and asset class, for the per-kind
// concentration check) derived from `positions.ts`, the same fixture the rest of the product
// reads, rather than a hand-typed map that disagreed with it on every account it covered.
const EXISTING_POSITIONS: Record<string, Record<string, { weight: number; assetClass: string }>> =
  Object.fromEntries(
    accounts.map((a) => [
      a.id,
      Object.fromEntries(
        getPositionsForAccount(a.id, a.totalValue).map((p) => [p.symbol, { weight: p.weight, assetClass: p.assetClass }]),
      ),
    ]),
  )

function checkTradesForAccount(req: TradeComplianceRequest): TradeComplianceResult {
  const checks: TradeComplianceCheck[] = []
  const account = accounts.find((a) => a.id === req.accountId)
  const accountValue = ACCOUNT_VALUES[req.accountId] ?? 1_000_000
  const currentCash = ACCOUNT_CASH[req.accountId] ?? 20_000
  const positions = EXISTING_POSITIONS[req.accountId] ?? {}
  // C10 · tax-loss-harvesting — wash-sale windows are household-scoped (Task 14), not
  // account-scoped: a loss sale in one household account restricts a repurchase in a sibling
  // account. `realisedSales` carries `householdId`, so `openWashSaleWindows` already derives this.
  const openWindows = account ? openWashSaleWindows(todayISO(), account.householdId) : []

  // ── Rule 1: Restricted securities ──
  const restrictedTrades = req.trades.filter((t) => RESTRICTED_SECURITIES.has(t.symbol))
  if (restrictedTrades.length > 0) {
    for (const t of restrictedTrades) {
      checks.push({
        rule: `Restricted security: ${t.symbol}`,
        category: 'restricted_securities',
        status: 'fail',
        message: `${t.symbol} is on the firm restricted list. Trade cannot proceed without compliance override.`,
        details: { symbol: t.symbol },
      })
    }
  } else {
    checks.push({
      rule: 'Restricted securities list',
      category: 'restricted_securities',
      status: 'pass',
      message: 'No proposed trades involve restricted securities.',
    })
  }

  // ── Rule 2: Concentration limits (per security kind — single-issuer / fund / cash) ──
  // §9.2 · pre-trade-compliance — this loop used to visit only proposed buys, then emit "All
  // post-trade positions within their applicable concentration limits" whenever none of THOSE
  // buys tripped a limit. acc-002 holds SPY at 44.8% against a 35% fund limit; a clean AGG buy
  // (which never touches SPY) certified a book with a real, unrelated breach still in it. The
  // projection below covers every symbol the account will hold after the trade — positions the
  // trade never touches carry their current weight forward, positions a buy or sell touches are
  // moved by it — and each breach found is reported as pre-existing (the account was already over
  // the limit before this trade) or trade-created, so a compliance officer sees both.
  const projected = new Map<string, { weight: number; assetClass: string }>()
  for (const [symbol, position] of Object.entries(positions)) {
    projected.set(symbol, { weight: position.weight, assetClass: position.assetClass })
  }
  for (const trade of req.trades) {
    const existing = projected.get(trade.symbol)
    const assetClass = existing?.assetClass ?? 'us_equity'
    const deltaWeight = (trade.side === 'buy' ? 1 : -1) * (trade.estimatedValue / accountValue)
    const weight = Math.max(0, (existing?.weight ?? 0) + deltaWeight)
    projected.set(trade.symbol, { weight, assetClass })
  }

  let concentrationFailed = false
  for (const [symbol, proj] of projected) {
    const originalWeight = positions[symbol]?.weight ?? 0
    const kind = securityKind(symbol, proj.assetClass)
    const limit = concentrationLimitFor(kind)
    const postTradeWeight = proj.weight
    // Pre-existing only if the account was already over the limit before this trade's
    // contribution — not merely because the projected (post-trade) weight is over it.
    const preExisting = originalWeight > limit

    // Same ladder as `/api/oms/orders/pre-check` in `oms.ts`: warn approaching the limit (80% of
    // it), fail/block at the limit itself. The two endpoints previously disagreed — this one
    // only fired once the limit was already crossed, and called it "fail" only above 1.5x — so
    // the same trade could be a block on one surface and a mere warning on the other.
    if (postTradeWeight > limit * 0.8) {
      concentrationFailed = true
      const kindLabel = kind === 'single_name' ? 'single-name' : kind === 'fund' ? 'pooled-vehicle' : 'cash'
      const status = postTradeWeight > limit ? 'fail' : 'warning'
      const message = preExisting
        ? `${symbol} is already ${(originalWeight * 100).toFixed(1)}% of the account, exceeding the ${(limit * 100).toFixed(0)}% ${kindLabel} limit; this trade does not create the breach.`
        : `Post-trade weight of ${symbol} would be ${(postTradeWeight * 100).toFixed(1)}%, ${status === 'fail' ? 'exceeding' : 'approaching'} the ${(limit * 100).toFixed(0)}% ${kindLabel} limit.`
      checks.push({
        rule: `Concentration limit: ${symbol}`,
        category: 'concentration_limit',
        status,
        message,
        details: {
          symbol,
          currentWeight: originalWeight,
          postTradeWeight,
          limit,
          preExisting,
        },
      })
    }
  }
  if (!concentrationFailed) {
    checks.push({
      rule: 'Concentration limit (per security kind)',
      category: 'concentration_limit',
      status: 'pass',
      message: 'All post-trade positions within their applicable concentration limits.',
    })
  }

  // ── Rule 3: Cash minimum (2% post-trade) ──
  const netCashChange = req.trades.reduce((sum, t) => {
    return sum + (t.side === 'sell' ? t.estimatedValue : -t.estimatedValue)
  }, 0)
  const postTradeCash = currentCash + netCashChange
  const postTradeCashPct = postTradeCash / accountValue
  const minimumCash = accountValue * CASH_MINIMUM_PCT

  if (postTradeCashPct < CASH_MINIMUM_PCT) {
    checks.push({
      rule: 'Cash reserve minimum (2%)',
      category: 'cash_minimum',
      status: postTradeCash < 0 ? 'fail' : 'warning',
      message: `Post-trade cash would be ${formatUSD(postTradeCash)} (${(postTradeCashPct * 100).toFixed(1)}%), below the ${(CASH_MINIMUM_PCT * 100).toFixed(0)}% minimum of ${formatUSD(minimumCash)}.`,
      details: {
        cashBalance: postTradeCash,
        minimumCash,
      },
    })
  } else {
    checks.push({
      rule: 'Cash reserve minimum (2%)',
      category: 'cash_minimum',
      status: 'pass',
      message: `Post-trade cash balance of ${formatUSD(postTradeCash)} (${(postTradeCashPct * 100).toFixed(1)}%) meets the 2% minimum reserve.`,
      details: {
        cashBalance: postTradeCash,
        minimumCash,
      },
    })
  }

  // ── Rule 4: Wash sale detection (household-scoped, 61-day window — Task 14 / C10) ──
  let washSaleDetected = false
  for (const trade of req.trades) {
    if (trade.side !== 'buy') continue
    const openWindow = openWindows.find((w) => w.symbol === trade.symbol)
    if (openWindow) {
      washSaleDetected = true
      checks.push({
        rule: `Wash sale window: ${trade.symbol}`,
        category: 'wash_sale',
        status: 'warning',
        message: `${trade.symbol} was sold at a loss in this household on ${openWindow.saleDate}. Repurchase before ${openWindow.end} may trigger wash sale rules and disallow the realized loss.`,
        details: { symbol: trade.symbol },
      })
    }
  }
  if (!washSaleDetected) {
    checks.push({
      rule: 'Wash sale window (61-day)',
      category: 'wash_sale',
      status: 'pass',
      message: "No proposed buys conflict with the household's recent loss sales within the 61-day wash sale window.",
    })
  }

  let overallStatus: TradeComplianceResult['overallStatus'] = 'pass'
  if (checks.some((c) => c.status === 'fail')) {
    overallStatus = 'fail'
  } else if (checks.some((c) => c.status === 'warning')) {
    overallStatus = 'warning'
  }

  return { accountId: req.accountId, checks, overallStatus }
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

// D21 — exported so the dashboard metrics derivation (`pms.ts`) reads the same alerts the
// compliance surfaces do, rather than a second hardcoded count.
export const complianceAlerts: ComplianceAlert[] = [
  { id: 'comp-001', type: 'Large Wire', severity: 'critical', title: 'Large wire deposit — source-of-funds required', description: '$250,000 incoming wire to Richard Anderson (acc-022). BSA/AML documentation required before funds release.', entityType: 'account', entityId: 'acc-022', reviewStatus: 'pending', createdAt: '2026-02-24T15:10:00Z' },
  { id: 'comp-002', type: 'Concentration', severity: 'warning', title: 'Single-name concentration — AAPL in Johnson Trust', description: 'AAPL position at 7.6% of account value approaching 10% single-name guideline.', entityType: 'account', entityId: 'acc-001', reviewStatus: 'in_review', createdAt: '2026-02-23T08:00:00Z' },
  { id: 'comp-003', type: 'Suitability', severity: 'warning', title: 'Suitability review — Foster account opening', description: 'New individual brokerage for William Foster. Risk tolerance assessment and investment experience verification needed.', entityType: 'client', entityId: 'cli-017', reviewStatus: 'in_review', createdAt: '2026-02-22T14:00:00Z' },
  { id: 'comp-004', type: 'Trade Pre-clearance', severity: 'info', title: 'Pre-trade compliance check passed — Martinez rebalance', description: 'All proposed trades for Michael Martinez rebalance cleared compliance screening.', entityType: 'trade', entityId: 'acc-015', reviewStatus: 'approved', createdAt: '2026-02-22T09:30:00Z', resolvedAt: '2026-02-22T09:35:00Z' },
  { id: 'comp-005', type: 'Document Expiry', severity: 'warning', title: 'IPS approaching annual review — Thompson', description: 'James Thompson IPS last reviewed Oct 2025. Annual review due by Oct 2026.', entityType: 'document', entityId: 'doc-014', reviewStatus: 'pending', createdAt: '2026-02-20T08:00:00Z' },
  { id: 'comp-006', type: 'Wash Sale', severity: 'info', title: 'Potential wash sale cleared — Johnson INTC/SMH', description: 'INTC sold and replaced with SMH. Different ETF confirmed, no wash sale issue.', entityType: 'trade', entityId: 'acc-002', reviewStatus: 'approved', createdAt: '2026-02-21T14:00:00Z', resolvedAt: '2026-02-21T14:10:00Z' },
  { id: 'comp-007', type: 'RMD', severity: 'warning', title: 'RMD calculation needed — Thompson Traditional IRA', description: 'James Thompson turns 73 this year. First RMD from Traditional IRA (acc-020) must be calculated.', entityType: 'account', entityId: 'acc-020', reviewStatus: 'pending', createdAt: '2026-02-01T08:00:00Z' },
]

const supervisionRecords: SupervisionRecord[] = [
  { id: 'sr-001', alertId: 'comp-004', reviewer: 'Mark Davis (CCO)', action: 'Approved', notes: 'All trades within portfolio guidelines. No restricted securities.', timestamp: '2026-02-22T09:35:00Z' },
  { id: 'sr-002', alertId: 'comp-006', reviewer: 'Mark Davis (CCO)', action: 'Approved', notes: 'SMH is a distinct ETF from INTC. No wash sale concern.', timestamp: '2026-02-21T14:10:00Z' },
  { id: 'sr-003', alertId: 'comp-002', reviewer: 'Mark Davis (CCO)', action: 'Under Review', notes: 'Reviewing client IPS for AAPL exception. Position is long-held with significant unrealized gain.', timestamp: '2026-02-23T10:00:00Z' },
]

export const complianceHandlers = [
  http.post('/api/compliance/check-trades', async ({ request }) => {
    const body = await request.json() as { accounts: TradeComplianceRequest[] }
    const results = body.accounts.map((acct) => checkTradesForAccount(acct))
    return HttpResponse.json(results)
  }),

  http.get('/api/compliance/alerts', ({ request }) => {
    const url = new URL(request.url)
    const severity = url.searchParams.get('severity')
    const status = url.searchParams.get('status')
    let filtered = [...complianceAlerts]
    if (severity) filtered = filtered.filter((a) => a.severity === severity)
    if (status) filtered = filtered.filter((a) => a.reviewStatus === status)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/compliance/review-queue', () => {
    return HttpResponse.json(complianceAlerts.filter((a) => a.reviewStatus === 'pending' || a.reviewStatus === 'in_review'))
  }),

  http.get('/api/compliance/alerts/:alertId/records', ({ params }) => {
    const records = supervisionRecords.filter((r) => r.alertId === params.alertId)
    return HttpResponse.json(records)
  }),
]
