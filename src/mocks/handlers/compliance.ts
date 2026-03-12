import { http, HttpResponse } from 'msw'
import type { ComplianceAlert, SupervisionRecord, TradeComplianceRequest, TradeComplianceCheck, TradeComplianceResult } from '@/types/compliance'

// ── Restricted securities list ──
const RESTRICTED_SECURITIES = new Set([
  'META', 'GOOG', 'GOOGL', // Firm has investment banking relationship
  'COIN',                    // Insider affiliation
  'GME', 'AMC',             // Heightened risk designation
])

// ── Concentration limits ──
const SINGLE_NAME_LIMIT = 0.10      // 10% single position
const CASH_MINIMUM_PCT = 0.02       // 2% cash minimum

// ── Account data derived from accounts.ts for compliance checks ──
// Values must match the canonical account data
import { accounts } from '../data/accounts'

const ACCOUNT_VALUES: Record<string, number> = Object.fromEntries(
  accounts.map((a) => [a.id, a.totalValue])
)
const ACCOUNT_CASH: Record<string, number> = Object.fromEntries(
  accounts.map((a) => [a.id, a.cashBalance])
)

// Existing large positions per account (for concentration check)
const EXISTING_POSITIONS: Record<string, Record<string, number>> = {
  'acc-001': { VTI: 0.32, AGG: 0.18, AAPL: 0.076, NVDA: 0.05, VXUS: 0.12, BND: 0.10, VNQ: 0.04, CASH: 0.035 },
  'acc-002': { VTI: 0.25, QQQ: 0.15, INTC: 0.06, IBIT: 0.03, ETHE: 0.02, BND: 0.14, EFA: 0.10, BXPE: 0.04, CASH: 0.023 },
  'acc-006': { VTI: 0.30, VXUS: 0.15, AGG: 0.20, TLT: 0.08, VNQ: 0.05, EFA: 0.09, GLD: 0.04, CASH: 0.034 },
  'acc-011': { SPY: 0.35, BND: 0.20, EFA: 0.12, VNQ: 0.06, CASH: 0.023 },
  'acc-015': { VTI: 0.28, EFA: 0.14, GLD: 0.06, AGG: 0.18, VNQ: 0.08, CASH: 0.024 },
}

// Recent sells for wash sale detection (symbol → date sold)
const RECENT_SELLS: Record<string, Record<string, string>> = {
  'acc-002': { INTC: '2026-02-21' },
}

function checkTradesForAccount(req: TradeComplianceRequest): TradeComplianceResult {
  const checks: TradeComplianceCheck[] = []
  const accountValue = ACCOUNT_VALUES[req.accountId] ?? 1_000_000
  const currentCash = ACCOUNT_CASH[req.accountId] ?? 20_000
  const positions = EXISTING_POSITIONS[req.accountId] ?? {}
  const recentSells = RECENT_SELLS[req.accountId] ?? {}

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

  // ── Rule 2: Concentration limits (>10% single name post-trade) ──
  let concentrationFailed = false
  for (const trade of req.trades) {
    if (trade.side === 'buy') {
      const currentWeight = positions[trade.symbol] ?? 0
      const additionalWeight = trade.estimatedValue / accountValue
      const postTradeWeight = currentWeight + additionalWeight

      if (postTradeWeight > SINGLE_NAME_LIMIT) {
        concentrationFailed = true
        checks.push({
          rule: `Concentration limit: ${trade.symbol}`,
          category: 'concentration_limit',
          status: postTradeWeight > 0.15 ? 'fail' : 'warning',
          message: `Post-trade weight of ${trade.symbol} would be ${(postTradeWeight * 100).toFixed(1)}%, ${postTradeWeight > 0.15 ? 'exceeding' : 'approaching'} the ${(SINGLE_NAME_LIMIT * 100).toFixed(0)}% single-name limit.`,
          details: {
            symbol: trade.symbol,
            currentWeight,
            postTradeWeight,
            limit: SINGLE_NAME_LIMIT,
          },
        })
      }
    }
  }
  if (!concentrationFailed) {
    checks.push({
      rule: 'Concentration limit (10% single name)',
      category: 'concentration_limit',
      status: 'pass',
      message: 'All post-trade positions within single-name concentration limits.',
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

  // ── Rule 4: Wash sale detection ──
  const today = new Date('2026-02-26')
  let washSaleDetected = false
  for (const trade of req.trades) {
    const sellDateStr = recentSells[trade.symbol]
    if (trade.side === 'buy' && sellDateStr) {
      const sellDate = new Date(sellDateStr)
      const daysSinceSell = Math.floor((today.getTime() - sellDate.getTime()) / 86_400_000)
      if (daysSinceSell <= 30) {
        washSaleDetected = true
        checks.push({
          rule: `Wash sale window: ${trade.symbol}`,
          category: 'wash_sale',
          status: 'warning',
          message: `${trade.symbol} was sold ${daysSinceSell} days ago. Repurchase within 30 days may trigger wash sale rules and disallow the realized loss.`,
          details: { symbol: trade.symbol },
        })
      }
    }
  }
  if (!washSaleDetected) {
    checks.push({
      rule: 'Wash sale window (30-day)',
      category: 'wash_sale',
      status: 'pass',
      message: 'No proposed buys conflict with recent sells within the 30-day wash sale window.',
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

const alerts: ComplianceAlert[] = [
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
    let filtered = [...alerts]
    if (severity) filtered = filtered.filter((a) => a.severity === severity)
    if (status) filtered = filtered.filter((a) => a.reviewStatus === status)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/compliance/review-queue', () => {
    return HttpResponse.json(alerts.filter((a) => a.reviewStatus === 'pending' || a.reviewStatus === 'in_review'))
  }),

  http.get('/api/compliance/alerts/:alertId/records', ({ params }) => {
    const records = supervisionRecords.filter((r) => r.alertId === params.alertId)
    return HttpResponse.json(records)
  }),
]
