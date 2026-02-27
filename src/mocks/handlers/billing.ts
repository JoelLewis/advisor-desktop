import { http, HttpResponse } from 'msw'
import { billingCycles, householdFees, billingExceptions, breakpointAnalyses } from '../data/billing'

export const billingHandlers = [
  http.get('/api/billing/cycles', () => {
    return HttpResponse.json(billingCycles)
  }),

  http.get('/api/billing/fees', () => {
    return HttpResponse.json(householdFees)
  }),

  http.get('/api/billing/exceptions', ({ request }) => {
    const url = new URL(request.url)
    const resolved = url.searchParams.get('resolved')
    let filtered = [...billingExceptions]
    if (resolved === 'false') filtered = filtered.filter((e) => !e.resolvedAt)
    if (resolved === 'true') filtered = filtered.filter((e) => !!e.resolvedAt)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/billing/breakpoints', () => {
    return HttpResponse.json(breakpointAnalyses)
  }),
]
