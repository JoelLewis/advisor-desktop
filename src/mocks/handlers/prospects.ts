import { http, HttpResponse } from 'msw'
import { prospects } from '../data/prospects'
import type { Prospect } from '@/types/prospect'

const prospectStore = [...prospects]

export const prospectHandlers = [
  http.get('/api/prospects', ({ request }) => {
    const url = new URL(request.url)
    const stage = url.searchParams.get('stage')

    let filtered = [...prospectStore]
    if (stage) filtered = filtered.filter((p) => p.stage === stage)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/prospects/:id', ({ params }) => {
    const prospect = prospectStore.find((p) => p.id === params.id)
    if (!prospect) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: `Prospect ${String(params.id)} not found` },
        { status: 404 },
      )
    }
    return HttpResponse.json(prospect)
  }),

  http.post('/api/prospects', async ({ request }) => {
    const body = (await request.json()) as Omit<Prospect, 'id'>
    const newProspect: Prospect = {
      ...body,
      id: `prsp-${String(prospectStore.length + 1).padStart(3, '0')}`,
    }
    prospectStore.push(newProspect)
    return HttpResponse.json(newProspect, { status: 201 })
  }),

  http.put('/api/prospects/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Prospect>
    const index = prospectStore.findIndex((p) => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: `Prospect ${String(params.id)} not found` },
        { status: 404 },
      )
    }
    const existing = prospectStore[index]
    if (!existing) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: `Prospect ${String(params.id)} not found` },
        { status: 404 },
      )
    }
    Object.assign(existing, body)
    return HttpResponse.json(existing)
  }),
]
