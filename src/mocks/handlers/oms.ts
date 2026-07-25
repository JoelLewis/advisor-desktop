import { http, HttpResponse } from 'msw'
import type { Order, RebalancePreview, ProposedTrade, ComplianceCheck, TradeRequest, PreTradeCheckRequest, PreTradeViolation } from '@/services/oms'
import { notFound } from './utils'
import { RESTRICTED_SECURITIES } from './compliance'
import { computeDriftForAccount } from './pms'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { openWashSaleWindows } from '../data/realised-sales'
import { accountValueUSD } from '@/lib/aum'
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/** Pooled/individual tech names used by the sector-concentration check below. */
const TECH_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA']

const orders: Order[] = [
  // ── Recent orders for Johnson Family Trust (acc-001) ──
  { id: 'ord-001', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 150, orderType: 'market', status: 'filled', filledQuantity: 150, filledPrice: 268.35, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:02Z', assetClass: 'equity' },
  { id: 'ord-002', accountId: 'acc-001', symbol: 'AGG', side: 'buy', quantity: 500, orderType: 'market', status: 'filled', filledQuantity: 500, filledPrice: 98.42, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:01Z', assetClass: 'equity' },
  { id: 'ord-003', accountId: 'acc-001', symbol: 'NVDA', side: 'sell', quantity: 25, orderType: 'limit', limitPrice: 785.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:31:00Z', assetClass: 'equity' },

  // ── Robert Johnson Individual (acc-002) ──
  // D28 — this fill is the same event as rs-001, so it prices at rs-001's $142,250 / 5,000 shares
  // and acc-002's INTC position now shows the 7,000 shares left after it.
  { id: 'ord-004', accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, orderType: 'market', status: 'filled', filledQuantity: 5000, filledPrice: 28.45, submittedAt: '2026-02-21T10:15:00Z', filledAt: '2026-02-21T10:15:03Z', assetClass: 'equity' },
  { id: 'ord-005', accountId: 'acc-002', symbol: 'QQQ', side: 'buy', quantity: 200, orderType: 'limit', limitPrice: 480.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:35:00Z', assetClass: 'equity' },

  // ── Chen Irrevocable Trust (acc-006) ──
  { id: 'ord-006', accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 800, orderType: 'market', status: 'filled', filledQuantity: 800, filledPrice: 268.40, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:04Z', assetClass: 'equity' },
  { id: 'ord-007', accountId: 'acc-006', symbol: 'TLT', side: 'sell', quantity: 300, orderType: 'market', status: 'filled', filledQuantity: 300, filledPrice: 95.65, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:02Z', assetClass: 'equity' },

  // ── David Williams Individual (acc-011) ──
  { id: 'ord-008', accountId: 'acc-011', symbol: 'SPY', side: 'buy', quantity: 100, orderType: 'market', status: 'submitted', filledQuantity: 0, submittedAt: '2026-02-25T10:00:00Z', assetClass: 'equity' },
  { id: 'ord-009', accountId: 'acc-011', symbol: 'BND', side: 'sell', quantity: 200, orderType: 'market', status: 'cancelled', filledQuantity: 0, submittedAt: '2026-02-24T15:45:00Z', assetClass: 'equity' },

  // ── Michael Martinez Individual (acc-015) ──
  { id: 'ord-010', accountId: 'acc-015', symbol: 'EFA', side: 'buy', quantity: 350, orderType: 'limit', limitPrice: 81.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:45:00Z', assetClass: 'equity' },
  { id: 'ord-011', accountId: 'acc-015', symbol: 'GLD', side: 'sell', quantity: 50, orderType: 'market', status: 'filled', filledQuantity: 50, filledPrice: 215.80, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:01Z', assetClass: 'equity' },
  { id: 'ord-012', accountId: 'acc-015', symbol: 'VNQ', side: 'buy', quantity: 200, orderType: 'market', status: 'filled', filledQuantity: 200, filledPrice: 89.15, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:02Z', assetClass: 'equity' },

  // ── Multi-asset orders ──
  // D26 — a mutual fund order cannot fill at 11:00 ET. Rule 22c-1 requires forward pricing at the
  // next computed NAV, which for VFIAX is 4:00 PM ET (21:00Z), and a $25,000 dollar-amount purchase
  // buys $25,000 / $465.32 shares, not the placeholder 1.
  //
  // 53.72647 — five decimals, because no shorter rounding reconciles: 53.73 multiplies out to
  // $25,001.64, and 53.727 to $25,000.25, while 53.72647 x 465.32 = $25,000.00103, which agrees with
  // `dollarAmount` to the cent. Fractional-share precision beyond the three decimals retail
  // statements usually display is a settlement-layer detail; the arithmetic is the reason here, not
  // a claim about any particular clearing system's record layout.
  { id: 'ord-013', accountId: 'acc-001', symbol: 'VFIAX', side: 'purchase', quantity: 53.72647, orderType: 'market', status: 'filled', filledQuantity: 53.72647, filledPrice: 465.32, submittedAt: '2026-02-23T15:00:00Z', filledAt: '2026-02-23T21:00:00Z', assetClass: 'mutual_fund', dollarAmount: 25000, amountType: 'dollars' },
  { id: 'ord-014', accountId: 'acc-002', symbol: 'UST-10Y', side: 'buy', quantity: 50, orderType: 'limit', limitPrice: 95.25, status: 'filled', filledQuantity: 50, filledPrice: 95.20, submittedAt: '2026-02-22T10:30:00Z', filledAt: '2026-02-22T10:30:05Z', assetClass: 'fixed_income', parAmount: 50000, bondPriceType: 'price', priceOrYield: 95.25 },
  // D27 — spot BTC settled into acc-002, a Schwab brokerage that can only hold the IBIT and ETHE
  // ETFs. It belongs in acc-045, the Coinbase account that actually custodies coins, and at the one
  // BTC price the app knows.
  { id: 'ord-015', accountId: 'acc-045', symbol: 'BTC', side: 'buy', quantity: 0.25, orderType: 'market', status: 'filled', filledQuantity: 0.25, filledPrice: 87_450.00, submittedAt: '2026-02-21T14:15:00Z', filledAt: '2026-02-21T14:15:01Z', assetClass: 'digital_asset', fractionalQuantity: true },
  { id: 'ord-016', accountId: 'acc-006', symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, orderType: 'limit', limitPrice: 8.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T11:00:00Z', assetClass: 'option', underlying: 'AAPL', optionType: 'call', strikePrice: 185, expirationDate: '2026-03-21', contractMultiplier: 100 },
]

/**
 * C26 · rebalancing / tax-efficiency — `taxImpact: taxAware ? 3_800 : 0` made the riskier setting
 * display as free. Tax is estimated from the account's actual embedded gain at the applicable
 * rate, so a tax-unaware rebalance realises MORE than a tax-aware one, never zero.
 *
 * Trades come from the account's own drift (`computeDriftForAccount`, the same function the
 * drift surface reads), not a hardcoded four-trade list scaled x5 for two accounts. `d.actual >
 * d.target` — not `d.drift`, which `computeDriftForAccount` already returns as an unsigned
 * magnitude — is what tells an overweight asset class (sell) from an underweight one (buy).
 */
function generateRebalanceTrades(accountId: string, taxAware: boolean): ProposedTrade[] {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return []
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account)

  return drift.assetClassDrifts
    .filter((d) => d.drift > 0.005)
    .flatMap((d) => {
      const candidates = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH')
      const target = candidates[0]
      if (!target) return []
      const notional = d.drift * account.totalValue
      const side = d.actual > d.target ? 'sell' : 'buy'
      // Realised gain on a sell = notional x the position's embedded gain fraction. A tax-aware
      // pass selects the highest-basis lots and realises roughly 40% of the naive figure.
      const embeddedGainFraction = target.marketValue > 0 ? target.gainLoss / target.marketValue : 0
      const realised = side === 'sell' ? notional * embeddedGainFraction : 0
      const rate = 0.238
      const taxImpact = Math.max(0, Math.round(realised * rate * (taxAware ? 0.4 : 1)))
      return [{
        symbol: target.symbol,
        name: target.name,
        side,
        quantity: Math.round(notional / target.price),
        estimatedValue: Math.round(notional),
        taxImpact,
        washSaleRisk: false,
      }]
    })
}

function generateComplianceChecks(): ComplianceCheck[] {
  return [
    { rule: 'Concentration limit (10% single name)', status: 'pass', message: 'No single position exceeds 10% of portfolio' },
    { rule: 'Restricted securities list', status: 'pass', message: 'No restricted securities in proposed trades' },
    { rule: 'Cash reserve minimum (2%)', status: 'pass', message: 'Post-trade cash balance meets minimum reserve' },
    { rule: 'Wash sale (61-day window)', status: 'warning', message: 'VTI sold within 30 days of purchase — verify no wash sale' },
  ]
}

export const omsHandlers = [
  http.get('/api/oms/orders', ({ request }) => {
    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId')
    const status = url.searchParams.get('status')
    const assetClass = url.searchParams.get('assetClass')

    let filtered = orders
    if (accountId) filtered = filtered.filter((o) => o.accountId === accountId)
    if (status) filtered = filtered.filter((o) => o.status === status)
    if (assetClass) filtered = filtered.filter((o) => o.assetClass === assetClass)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/oms/orders/:orderId', ({ params }) => {
    const order = orders.find((o) => o.id === params.orderId)
    if (!order) return notFound()
    return HttpResponse.json(order)
  }),

  http.post('/api/oms/orders', async ({ request }) => {
    const body = await request.json() as TradeRequest
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      accountId: body.accountId,
      symbol: body.symbol,
      side: body.side,
      quantity: body.quantity,
      orderType: body.orderType,
      limitPrice: body.limitPrice,
      stopPrice: body.stopPrice,
      status: 'submitted',
      filledQuantity: 0,
      submittedAt: new Date().toISOString(),
      assetClass: body.assetClass,
      timeInForce: body.timeInForce,
      extendedHours: body.extendedHours,
      underlying: body.underlying,
      optionType: body.optionType,
      strikePrice: body.strikePrice,
      expirationDate: body.expirationDate,
      contractMultiplier: body.contractMultiplier,
      amountType: body.amountType,
      dollarAmount: body.dollarAmount,
      exchangeTargetSymbol: body.exchangeTargetSymbol,
      parAmount: body.parAmount,
      bondPriceType: body.bondPriceType,
      priceOrYield: body.priceOrYield,
      fractionalQuantity: body.fractionalQuantity,
      estimatedValue: body.estimatedValue,
      commission: body.commission,
    }
    orders.push(newOrder)
    return HttpResponse.json(newOrder, { status: 201 })
  }),

  // Pre-trade compliance check
  http.post('/api/oms/orders/pre-check', async ({ request }) => {
    const body = await request.json() as PreTradeCheckRequest
    const violations: PreTradeViolation[] = []
    const sym = body.symbol.toUpperCase()

    // C28 · pre-trade-compliance / order-lifecycle — notional is required. Inferring it from
    // `quantity * 100` valued a 100-share order in a $900 stock at $10,000 instead of $90,000,
    // so concentration limits were evadable by trading high-priced securities.
    if (typeof body.estimatedValue !== 'number' || !Number.isFinite(body.estimatedValue)) {
      return HttpResponse.json(
        { error: 'estimatedValue (notional) is required for a pre-trade check' },
        { status: 400 },
      )
    }
    const estValue = body.estimatedValue

    const account = accounts.find((a) => a.id === body.accountId)
    if (!account) return notFound()
    // C27 · pre-trade-compliance — the account's own market value, not a hardcoded $2,500,000.
    const accountValue = accountValueUSD(account, FX_RATES_USD_BASE)
    const positions = getPositionsForAccount(account.id, account.totalValue)
    const existingPosition = positions.find((p) => p.symbol === sym)
    const existing = existingPosition?.marketValue ?? 0

    // C23 · diversification — per-kind limit (single-issuer / fund / cash), not a blanket 10%.
    const kind = securityKind(sym, existingPosition?.assetClass ?? 'us_equity')
    const limit = concentrationLimitFor(kind)
    const isBuy = body.side.startsWith('buy') || body.side === 'purchase'
    const postTradeWeight = (existing + (isBuy ? estValue : -estValue)) / accountValue

    if (postTradeWeight > limit * 0.8) {
      violations.push({
        constraint: kind === 'single_name' ? 'Single-issuer concentration limit' : 'Pooled-vehicle concentration limit',
        severity: postTradeWeight > limit ? 'block' : 'warning',
        currentValue: `${(postTradeWeight * 100).toFixed(1)}%`,
        limit: `${(limit * 100).toFixed(1)}%`,
        message: `${sym} would be ${(postTradeWeight * 100).toFixed(1)}% of this account against a ${(limit * 100).toFixed(1)}% IPS limit.`,
      })
    }

    // Restricted securities check — D29: one list, shared with the pre-trade compliance engine.
    if (RESTRICTED_SECURITIES.has(sym)) {
      violations.push({
        constraint: 'Restricted securities list',
        severity: 'block',
        currentValue: sym,
        limit: 'Not permitted',
        message: `${sym} is on the firm restricted securities list. Trading is prohibited.`,
      })
    }

    // Wash sale check — derived from the household's actual realised loss sales (Task 14's
    // 61-day window), not a hand-typed symbol list. A wash sale is triggered by *repurchasing*
    // a security recently sold at a loss, so this applies to buys, and it is scoped to the
    // account's household — the same fact the tax page reads (`realisedSales` carries
    // `householdId`).
    if (isBuy) {
      const openWindow = openWashSaleWindows(MOCK_TODAY_ISO, account.householdId).find((w) => w.symbol === sym)
      if (openWindow) {
        violations.push({
          constraint: 'Wash sale rule (61-day window)',
          severity: 'warning',
          currentValue: `Sold at a loss ${openWindow.saleDate}`,
          limit: '61-day window',
          message: `${sym} was sold at a loss in this household on ${openWindow.saleDate}. Repurchasing before ${openWindow.end} may trigger a wash sale, disallowing the loss.`,
        })
      }
    }

    // Cash reserve check for buys
    const cashPct = (account.cashBalance / accountValue) * 100
    if (isBuy && estValue > 100_000) {
      violations.push({
        constraint: 'Cash reserve minimum (2%)',
        severity: 'warning',
        currentValue: `${cashPct.toFixed(1)}%`,
        limit: '2.0%',
        message: 'Post-trade cash balance would be near the 2% minimum reserve requirement.',
      })
    }

    // Sector concentration for known tech stocks — the account's actual technology exposure,
    // not a fixed 38.2%.
    if (TECH_SYMBOLS.includes(sym) && ['buy', 'buy_to_open'].includes(body.side) && estValue > 50_000) {
      const techWeight = positions
        .filter((p) => TECH_SYMBOLS.includes(p.symbol))
        .reduce((sum, p) => sum + p.marketValue, 0) / accountValue
      const projected = techWeight + estValue / accountValue
      violations.push({
        constraint: 'Sector concentration (Technology)',
        severity: 'warning',
        currentValue: `${(techWeight * 100).toFixed(1)}%`,
        limit: '40.0%',
        message: `Technology sector allocation is currently ${(techWeight * 100).toFixed(1)}%. This trade would push it to ~${(projected * 100).toFixed(1)}% (limit: 40%).`,
      })
    }

    return HttpResponse.json({
      passed: violations.every((v) => v.severity !== 'block'),
      violations,
    })
  }),

  http.post('/api/oms/rebalance', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; driftThreshold?: number; taxAware: boolean }
    const previews: RebalancePreview[] = body.accountIds.map((accountId) => {
      const trades = generateRebalanceTrades(accountId, body.taxAware)
      return {
        accountId,
        trades,
        // C26 — the total is the sum of the trades' own tax impacts, not a second literal that
        // could (and did) disagree with them.
        estimatedTaxImpact: trades.reduce((sum, t) => sum + t.taxImpact, 0),
        complianceChecks: generateComplianceChecks(),
      }
    })
    return HttpResponse.json(previews)
  }),

  http.post('/api/oms/rebalance/execute', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; taxAware: boolean }
    const results = body.accountIds.map((accountId) => ({
      accountId,
      status: 'submitted' as const,
      ordersCreated: generateRebalanceTrades(accountId, body.taxAware).length,
      estimatedCompletion: '2026-02-25T16:00:00Z',
    }))
    return HttpResponse.json(results)
  }),
]
