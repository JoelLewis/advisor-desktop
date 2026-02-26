import { http, HttpResponse } from 'msw'
import { clients } from '../data/clients'
import { households } from '../data/households'
import { activities } from '../data/activities'
import { notes } from '../data/notes'
import { heldAwayAssets } from '../data/held-away'

export const crmHandlers = [
  http.get('/api/crm/clients', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const segment = url.searchParams.get('segment')
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')

    let filtered = [...clients]
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search),
      )
    }
    if (segment) {
      filtered = filtered.filter((c) => c.segment === segment)
    }

    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    })
  }),

  http.get('/api/crm/clients/:clientId', ({ params }) => {
    const client = clients.find((c) => c.id === params.clientId)
    if (!client) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(client)
  }),

  http.get('/api/crm/households', () => {
    return HttpResponse.json({
      items: households,
      total: households.length,
      page: 1,
      pageSize: 20,
    })
  }),

  http.get('/api/crm/households/:householdId', ({ params }) => {
    const household = households.find((h) => h.id === params.householdId)
    if (!household) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(household)
  }),

  http.get('/api/crm/activities', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const start = (page - 1) * pageSize

    return HttpResponse.json({
      items: activities.slice(start, start + pageSize),
      total: activities.length,
      page,
      pageSize,
    })
  }),

  http.get('/api/crm/clients/:clientId/activities', ({ params }) => {
    const clientActivities = activities.filter(
      (a) => a.entityId === params.clientId,
    )
    return HttpResponse.json(clientActivities)
  }),

  http.get('/api/crm/clients/:clientId/notes', ({ params }) => {
    const clientNotes = notes
      .filter((n) => n.clientId === params.clientId)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    return HttpResponse.json(clientNotes)
  }),

  http.post('/api/crm/clients/:clientId/notes', async ({ params, request }) => {
    const body = await request.json() as { content: string }
    const newNote = {
      id: `note-${Date.now()}`,
      clientId: String(params.clientId),
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Sarah Mitchell',
      pinned: false,
      aiGenerated: false,
    }
    return HttpResponse.json(newNote, { status: 201 })
  }),

  http.get('/api/crm/households/:householdId/held-away', ({ params }) => {
    const assets = heldAwayAssets.filter((ha) => ha.householdId === params.householdId)
    return HttpResponse.json(assets)
  }),
]
