import { http, HttpResponse, delay } from 'msw'
import { campaigns, socialOpportunities, newsletters } from '../data/engage'
import { clientComms } from '../data/client-comms'

export const engageHandlers = [
  http.get('/api/engage/campaigns', () => {
    return HttpResponse.json({ items: campaigns, total: campaigns.length })
  }),

  http.get('/api/engage/social', () => {
    return HttpResponse.json({ items: socialOpportunities, total: socialOpportunities.length })
  }),

  http.get('/api/engage/newsletters', () => {
    return HttpResponse.json({ items: newsletters, total: newsletters.length })
  }),

  http.get('/api/engage/comms', () => {
    return HttpResponse.json({ items: clientComms, total: clientComms.length })
  }),

  http.post('/api/engage/compose-email', async () => {
    await delay(300)
    return HttpResponse.json({ success: true, id: `email-${Date.now()}` })
  }),

  http.post('/api/engage/log-call', async () => {
    await delay(300)
    return HttpResponse.json({ success: true, id: `call-${Date.now()}` })
  }),

  http.post('/api/engage/campaigns', async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { name: string; channel: string; audience: string; message: string }
    return HttpResponse.json({
      id: `camp-${Date.now()}`,
      name: body.name,
      channel: body.channel,
      status: 'draft',
      nbaTriggered: false,
      audienceCount: 0,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      complianceApproved: false,
    })
  }),

  http.patch('/api/engage/campaigns/:id/status', async ({ params, request }) => {
    await delay(200)
    const body = (await request.json()) as { status: string }
    const camp = campaigns.find((c) => c.id === params.id)
    return HttpResponse.json(camp ? { ...camp, status: body.status } : { id: params.id, status: body.status })
  }),

  http.post('/api/engage/social/:id/schedule', async ({ params }) => {
    await delay(200)
    const opp = socialOpportunities.find((s) => s.id === params.id)
    return HttpResponse.json(opp ? { ...opp, scheduledDate: new Date().toISOString() } : { id: params.id, scheduledDate: new Date().toISOString() })
  }),

  http.post('/api/engage/social/:id/request-approval', async ({ params }) => {
    await delay(200)
    const opp = socialOpportunities.find((s) => s.id === params.id)
    return HttpResponse.json(opp ? { ...opp, complianceStatus: 'pending' } : { id: params.id, complianceStatus: 'pending' })
  }),
]
