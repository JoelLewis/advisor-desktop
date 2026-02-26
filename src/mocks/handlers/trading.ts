import { http, HttpResponse } from 'msw'
import { symbols } from '../data/trading'

export const tradingHandlers = [
  // Symbol search
  http.get('/api/oms/symbols', ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toUpperCase() ?? ''
    if (!q) return HttpResponse.json([])
    const matches = symbols
      .filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
      .slice(0, 10)
    return HttpResponse.json(matches)
  }),

  // Model trade preview
  http.post('/api/oms/model-trade/preview', async ({ request }) => {
    const body = (await request.json()) as { modelId: string; accountIds: string[] }
    const previews = body.accountIds.map((accId) => ({
      accountId: accId,
      accountName: `Account ${accId}`,
      modelId: body.modelId,
      modelName: 'Growth Balanced',
      currentDrift: +((accId.charCodeAt(accId.length - 1) % 5) + 1.2).toFixed(1),
      trades: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          assetClass: 'us_equity',
          side: 'sell' as const,
          quantity: 15,
          estimatedValue: 2775,
          reason: 'Reduce US Equity overweight from 47% to 42%',
        },
        {
          symbol: 'AGG',
          name: 'iShares Core Agg Bond',
          assetClass: 'fixed_income',
          side: 'buy' as const,
          quantity: 25,
          estimatedValue: 2500,
          reason: 'Increase Fixed Income from 23% to 28% target',
        },
        {
          symbol: 'VXUS',
          name: 'Vanguard Intl Stock ETF',
          assetClass: 'intl_equity',
          side: 'buy' as const,
          quantity: 10,
          estimatedValue: 580,
          reason: 'Increase Intl Equity from 10% to 12% target',
        },
      ],
      estimatedTaxImpact: +((accId.charCodeAt(accId.length - 1) % 4) * 125 + 150).toFixed(2),
    }))
    return HttpResponse.json(previews)
  }),

  // Model trade execute
  http.post('/api/oms/model-trade/execute', async ({ request }) => {
    const body = (await request.json()) as { modelId: string; accountIds: string[] }
    return HttpResponse.json({
      status: 'submitted',
      ordersCreated: body.accountIds.length * 3,
    })
  }),
]
