import { http, HttpResponse } from 'msw'
import { documents } from '../data/documents'

export const documentHandlers = [
  http.get('/api/documents', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const clientId = url.searchParams.get('clientId')

    let filtered = [...documents]
    if (type) filtered = filtered.filter((d) => d.type === type)
    if (clientId) filtered = filtered.filter((d) => d.clientId === clientId)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/documents/clients/:clientId', ({ params }) => {
    const clientDocs = documents.filter((d) => d.clientId === params.clientId)
    return HttpResponse.json(clientDocs)
  }),

  http.get('/api/documents/templates', () => {
    return HttpResponse.json([
      { id: 'tpl-001', name: 'Investment Policy Statement', type: 'ips' },
      { id: 'tpl-002', name: 'Quarterly Performance Report', type: 'statement' },
      { id: 'tpl-003', name: 'Account Opening Agreement', type: 'agreement' },
      { id: 'tpl-004', name: 'Tax-Loss Harvesting Proposal', type: 'proposal' },
      { id: 'tpl-005', name: 'Meeting Notes Summary', type: 'meeting_notes' },
    ])
  }),
]
