import { http, HttpResponse } from 'msw'
import { FX_RATES_USD_BASE, FX_RATE_TIMESTAMP } from '../data/currencies'

export const fxHandlers = [
  // Get FX rates (USD base)
  http.get('/api/fx/rates', ({ request }) => {
    const url = new URL(request.url)
    const base = url.searchParams.get('base') ?? 'USD'

    // Simplification: always return USD-based rates regardless of base param
    return HttpResponse.json({
      base,
      rates: FX_RATES_USD_BASE,
      asOf: FX_RATE_TIMESTAMP,
    })
  }),

  // Convert between currencies
  http.get('/api/fx/convert', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? 'USD'
    const to = url.searchParams.get('to') ?? 'USD'
    const amountStr = url.searchParams.get('amount') ?? '0'
    const amount = parseFloat(amountStr)

    const rates = FX_RATES_USD_BASE as Record<string, number>
    const fromRate = from === 'USD' ? 1 : (rates[from] ?? 1)
    const toRate = to === 'USD' ? 1 : (rates[to] ?? 1)
    const converted = (amount / fromRate) * toRate

    return HttpResponse.json({
      from,
      to,
      amount,
      converted,
      rate: toRate / fromRate,
      asOf: FX_RATE_TIMESTAMP,
    })
  }),
]
