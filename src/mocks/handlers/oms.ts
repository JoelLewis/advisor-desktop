import { http, HttpResponse } from 'msw'
import type { Order, RebalancePreview, ProposedTrade, ComplianceCheck, TradeRequest, PreTradeCheckRequest, PreTradeViolation } from '@/services/oms'
import { notFound } from './utils'

const orders: Order[] = [
  // ── Recent orders for Johnson Family Trust (acc-001) ──
  { id: 'ord-001', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 150, orderType: 'market', status: 'filled', filledQuantity: 150, filledPrice: 268.35, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:02Z', assetClass: 'equity' },
  { id: 'ord-002', accountId: 'acc-001', symbol: 'AGG', side: 'buy', quantity: 500, orderType: 'market', status: 'filled', filledQuantity: 500, filledPrice: 98.42, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:01Z', assetClass: 'equity' },
  { id: 'ord-003', accountId: 'acc-001', symbol: 'NVDA', side: 'sell', quantity: 25, orderType: 'limit', limitPrice: 785.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:31:00Z', assetClass: 'equity' },

  // ── Robert Johnson Individual (acc-002) ──
  { id: 'ord-004', accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, orderType: 'market', status: 'filled', filledQuantity: 5000, filledPrice: 28.52, submittedAt: '2026-02-21T10:15:00Z', filledAt: '2026-02-21T10:15:03Z', assetClass: 'equity' },
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
  { id: 'ord-013', accountId: 'acc-001', symbol: 'VFIAX', side: 'purchase', quantity: 1, orderType: 'market', status: 'filled', filledQuantity: 1, filledPrice: 465.32, submittedAt: '2026-02-23T15:00:00Z', filledAt: '2026-02-23T16:00:00Z', assetClass: 'mutual_fund', dollarAmount: 25000, amountType: 'dollars' },
  { id: 'ord-014', accountId: 'acc-002', symbol: 'UST-10Y', side: 'buy', quantity: 50, orderType: 'limit', limitPrice: 95.25, status: 'filled', filledQuantity: 50, filledPrice: 95.20, submittedAt: '2026-02-22T10:30:00Z', filledAt: '2026-02-22T10:30:05Z', assetClass: 'fixed_income', parAmount: 50000, bondPriceType: 'price', priceOrYield: 95.25 },
  { id: 'ord-015', accountId: 'acc-002', symbol: 'BTC', side: 'buy', quantity: 0.25, orderType: 'market', status: 'filled', filledQuantity: 0.25, filledPrice: 86200.00, submittedAt: '2026-02-21T14:15:00Z', filledAt: '2026-02-21T14:15:01Z', assetClass: 'digital_asset', fractionalQuantity: true },
  { id: 'ord-016', accountId: 'acc-006', symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, orderType: 'limit', limitPrice: 8.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T11:00:00Z', assetClass: 'option', underlying: 'AAPL', optionType: 'call', strikePrice: 185, expirationDate: '2026-03-21', contractMultiplier: 100 },
]

function generateRebalanceTrades(accountId: string, taxAware: boolean): ProposedTrade[] {
  const trades: ProposedTrade[] = [
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', side: 'sell', quantity: 120, estimatedValue: 32_220, taxImpact: taxAware ? 3_800 : 0, washSaleRisk: false },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', side: 'buy', quantity: 250, estimatedValue: 24_625, taxImpact: 0, washSaleRisk: false },
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', side: 'buy', quantity: 180, estimatedValue: 14_814, taxImpact: 0, washSaleRisk: false },
    { symbol: 'CASH', name: 'Money Market Fund', side: 'sell', quantity: 1, estimatedValue: 7_219, taxImpact: 0, washSaleRisk: false },
  ]

  if (accountId.includes('006') || accountId.includes('001')) {
    return trades.map((t) => ({ ...t, quantity: t.quantity * 5, estimatedValue: t.estimatedValue * 5, taxImpact: t.taxImpact * 5 }))
  }
  return trades
}

function generateComplianceChecks(): ComplianceCheck[] {
  return [
    { rule: 'Concentration limit (10% single name)', status: 'pass', message: 'No single position exceeds 10% of portfolio' },
    { rule: 'Restricted securities list', status: 'pass', message: 'No restricted securities in proposed trades' },
    { rule: 'Cash reserve minimum (2%)', status: 'pass', message: 'Post-trade cash balance meets minimum reserve' },
    { rule: 'Tax-loss harvesting window', status: 'warning', message: 'VTI sold within 30 days of purchase — verify no wash sale' },
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
    const estValue = body.estimatedValue ?? body.quantity * 100 // rough estimate

    // Concentration check: large single-name positions trigger warnings/blocks
    if (estValue > 200_000) {
      violations.push({
        constraint: 'Single-security concentration limit',
        severity: estValue > 500_000 ? 'block' : 'warning',
        currentValue: `${((estValue / 2_500_000) * 100).toFixed(1)}%`,
        limit: '10.0%',
        message: `Position in ${sym} would represent ${((estValue / 2_500_000) * 100).toFixed(1)}% of portfolio (limit: 10%). ${estValue > 500_000 ? 'Exceeds IPS maximum.' : 'Approaching IPS limit.'}`,
      })
    }

    // Restricted securities check
    const restricted = ['GME', 'AMC', 'BBBY']
    if (restricted.includes(sym)) {
      violations.push({
        constraint: 'Restricted securities list',
        severity: 'block',
        currentValue: sym,
        limit: 'Not permitted',
        message: `${sym} is on the firm restricted securities list. Trading is prohibited.`,
      })
    }

    // Wash sale check for sells
    if (['sell', 'sell_to_close'].includes(body.side)) {
      const washSaleSymbols = ['VTI', 'NVDA', 'AAPL']
      if (washSaleSymbols.includes(sym)) {
        violations.push({
          constraint: 'Wash sale rule (30-day window)',
          severity: 'warning',
          currentValue: 'Bought 15 days ago',
          limit: '30-day window',
          message: `${sym} was purchased within the last 30 days. Selling now may trigger a wash sale, disallowing the tax loss.`,
        })
      }
    }

    // Cash reserve check for buys
    if (['buy', 'buy_to_open', 'purchase'].includes(body.side) && estValue > 100_000) {
      violations.push({
        constraint: 'Cash reserve minimum (2%)',
        severity: 'warning',
        currentValue: '2.8%',
        limit: '2.0%',
        message: 'Post-trade cash balance would be near the 2% minimum reserve requirement.',
      })
    }

    // Sector concentration for known tech stocks
    const techStocks = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA']
    if (techStocks.includes(sym) && ['buy', 'buy_to_open'].includes(body.side) && estValue > 50_000) {
      violations.push({
        constraint: 'Sector concentration (Technology)',
        severity: 'warning',
        currentValue: '38.2%',
        limit: '40.0%',
        message: `Technology sector allocation is currently 38.2%. This trade would push it to ~${(38.2 + (estValue / 2_500_000) * 100).toFixed(1)}% (limit: 40%).`,
      })
    }

    return HttpResponse.json({
      passed: violations.every((v) => v.severity !== 'block'),
      violations,
    })
  }),

  http.post('/api/oms/rebalance', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; driftThreshold: number; taxAware: boolean }
    const previews: RebalancePreview[] = body.accountIds.map((accountId) => ({
      accountId,
      trades: generateRebalanceTrades(accountId, body.taxAware),
      estimatedTaxImpact: body.taxAware ? 3_800 : 0,
      complianceChecks: generateComplianceChecks(),
    }))
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
