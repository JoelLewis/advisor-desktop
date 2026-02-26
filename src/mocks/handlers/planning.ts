import { http, HttpResponse } from 'msw'
import { plans } from '../data/planning'
import { notFound } from './utils'

export const planningHandlers = [
  http.get('/api/planning/clients/:clientId/plan', ({ params }) => {
    const plan = plans.find((p) => p.clientId === params.clientId)
    if (!plan) return notFound()
    return HttpResponse.json(plan)
  }),

  http.get('/api/planning/clients/:clientId/goals', ({ params }) => {
    const plan = plans.find((p) => p.clientId === params.clientId)
    if (!plan) return HttpResponse.json([])
    return HttpResponse.json(plan.goals)
  }),

  http.get('/api/planning/households/:householdId/plan', ({ params }) => {
    const plan = plans.find((p) => p.householdId === params.householdId)
    if (!plan) return notFound()
    return HttpResponse.json(plan)
  }),
]
