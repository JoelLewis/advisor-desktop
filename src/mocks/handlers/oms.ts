import { http, HttpResponse } from 'msw'
import type { Order, RebalancePreview, ProposedTrade, ComplianceCheck } from '@/services/oms'
import { notFound } from './utils'

const orders: Order[] = [
  // ── Recent orders for Johnson Family Trust (acc-001) ──
  { id: 'ord-001', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 150, orderType: 'market', status: 'filled', filledQuantity: 150, filledPrice: 268.35, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:02Z' },
  { id: 'ord-002', accountId: 'acc-001', symbol: 'AGG', side: 'buy', quantity: 500, orderType: 'market', status: 'filled', filledQuantity: 500, filledPrice: 98.42, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:01Z' },
  { id: 'ord-003', accountId: 'acc-001', symbol: 'NVDA', side: 'sell', quantity: 25, orderType: 'limit', limitPrice: 785.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:31:00Z' },

  // ── Robert Johnson Individual (acc-002) ──
  { id: 'ord-004', accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, orderType: 'market', status: 'filled', filledQuantity: 5000, filledPrice: 28.52, submittedAt: '2026-02-21T10:15:00Z', filledAt: '2026-02-21T10:15:03Z' },
  { id: 'ord-005', accountId: 'acc-002', symbol: 'QQQ', side: 'buy', quantity: 200, orderType: 'limit', limitPrice: 480.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:35:00Z' },

  // ── Chen Irrevocable Trust (acc-006) ──
  { id: 'ord-006', accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 800, orderType: 'market', status: 'filled', filledQuantity: 800, filledPrice: 268.40, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:04Z' },
  { id: 'ord-007', accountId: 'acc-006', symbol: 'TLT', side: 'sell', quantity: 300, orderType: 'market', status: 'filled', filledQuantity: 300, filledPrice: 95.65, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:02Z' },

  // ── David Williams Individual (acc-011) ──
  { id: 'ord-008', accountId: 'acc-011', symbol: 'SPY', side: 'buy', quantity: 100, orderType: 'market', status: 'submitted', filledQuantity: 0, submittedAt: '2026-02-25T10:00:00Z' },
  { id: 'ord-009', accountId: 'acc-011', symbol: 'BND', side: 'sell', quantity: 200, orderType: 'market', status: 'cancelled', filledQuantity: 0, submittedAt: '2026-02-24T15:45:00Z' },

  // ── Michael Martinez Individual (acc-015) ──
  { id: 'ord-010', accountId: 'acc-015', symbol: 'EFA', side: 'buy', quantity: 350, orderType: 'limit', limitPrice: 81.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:45:00Z' },
  { id: 'ord-011', accountId: 'acc-015', symbol: 'GLD', side: 'sell', quantity: 50, orderType: 'market', status: 'filled', filledQuantity: 50, filledPrice: 215.80, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:01Z' },
  { id: 'ord-012', accountId: 'acc-015', symbol: 'VNQ', side: 'buy', quantity: 200, orderType: 'market', status: 'filled', filledQuantity: 200, filledPrice: 89.15, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:02Z' },
]

function generateRebalanceTrades(accountId: string, taxAware: boolean): ProposedTrade[] {
  const trades: ProposedTrade[] = [
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', side: 'sell', quantity: 120, estimatedValue: 32_220, taxImpact: taxAware ? 3_800 : 0, washSaleRisk: false },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', side: 'buy', quantity: 250, estimatedValue: 24_625, taxImpact: 0, washSaleRisk: false },
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', side: 'buy', quantity: 180, estimatedValue: 14_814, taxImpact: 0, washSaleRisk: false },
    { symbol: 'CASH', name: 'Money Market Fund', side: 'sell', quantity: 1, estimatedValue: 7_219, taxImpact: 0, washSaleRisk: false },
  ]

  // Scale by account (larger accounts = larger trade sizes)
  if (accountId.includes('006') || accountId.includes('001')) {
    return trades.map((t) => ({ ...t, quantity: t.quantity * 5, estimatedValue: t.estimatedValue * 5, taxImpact: t.taxImpact * 5 }))
  }
  return trades
}

function generateComplianceChecks(): ComplianceCheck[] {
  return [
    { rule: 'Concentration limit (5% single name)', status: 'pass', message: 'No single position exceeds 5% of portfolio' },
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

    let filtered = orders
    if (accountId) filtered = filtered.filter((o) => o.accountId === accountId)
    if (status) filtered = filtered.filter((o) => o.status === status)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/oms/orders/:orderId', ({ params }) => {
    const order = orders.find((o) => o.id === params.orderId)
    if (!order) return notFound()
    return HttpResponse.json(order)
  }),

  http.post('/api/oms/orders', async ({ request }) => {
    const body = await request.json() as {
      accountId: string
      symbol: string
      side: 'buy' | 'sell'
      quantity: number
      orderType: 'market' | 'limit'
      limitPrice?: number
    }
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      accountId: body.accountId,
      symbol: body.symbol,
      side: body.side,
      quantity: body.quantity,
      orderType: body.orderType,
      limitPrice: body.limitPrice,
      status: 'submitted',
      filledQuantity: 0,
      submittedAt: new Date().toISOString(),
    }
    orders.push(newOrder)
    return HttpResponse.json(newOrder, { status: 201 })
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
