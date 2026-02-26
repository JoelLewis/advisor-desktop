import { http, HttpResponse } from 'msw'
import { feeSchedules, billingRecords, revenueMetrics, revenueTrend, revenueBySegment } from '../data/revenue'

export const revenueHandlers = [
  http.get('/api/revenue/metrics', () => {
    return HttpResponse.json(revenueMetrics)
  }),

  http.get('/api/revenue/fees', () => {
    return HttpResponse.json(feeSchedules)
  }),

  http.get('/api/revenue/billing', ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period')

    if (period) {
      const filtered = billingRecords.filter((r) => r.period === period)
      return HttpResponse.json(filtered)
    }

    return HttpResponse.json(billingRecords)
  }),

  http.get('/api/revenue/trend', () => {
    return HttpResponse.json(revenueTrend)
  }),

  http.get('/api/revenue/by-segment', () => {
    return HttpResponse.json(revenueBySegment)
  }),
]
