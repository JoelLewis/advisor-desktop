import { http, HttpResponse } from 'msw'
import { households } from '../data/households'
import { heldAwayAssets } from '../data/held-away'
import { notFound } from './utils'
import { refuseExternal } from './workspace-http'

export const crmHandlers = [
  http.get('/api/crm/households/:householdId', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const household = households.find((h) => h.id === params.householdId)
    if (!household) return notFound()
    return HttpResponse.json(household)
  }),

  http.get('/api/crm/households/:householdId/held-away', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const assets = heldAwayAssets.filter((ha) => ha.householdId === params.householdId)
    return HttpResponse.json(assets)
  }),
]
