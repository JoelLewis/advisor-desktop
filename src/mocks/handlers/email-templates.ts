import { http, HttpResponse, delay } from 'msw'
import type { EmailTemplate, TemplateCategory } from '@/types/email-template'
import { emailTemplates as seedData } from '@/mocks/data/email-templates'

const templates = new Map<string, EmailTemplate>(
  seedData.map((t) => [t.id, t]),
)

export const emailTemplateHandlers = [
  http.get('/api/settings/email-templates', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const category = url.searchParams.get('category') as TemplateCategory | null
    let results = Array.from(templates.values())
    if (category) results = results.filter((t) => t.category === category)
    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return HttpResponse.json(results)
  }),

  http.get('/api/settings/email-templates/:id', async ({ params }) => {
    await delay(100)
    const id = params.id as string
    const template = templates.get(id)
    if (!template) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(template)
  }),

  http.post('/api/settings/email-templates', async ({ request }) => {
    await delay(200)
    const body = await request.json() as Pick<EmailTemplate, 'name' | 'subject' | 'body' | 'category'>
    const id = `et-${Date.now()}`
    const now = new Date().toISOString()
    const template: EmailTemplate = {
      id,
      name: body.name,
      subject: body.subject,
      body: body.body,
      category: body.category,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    templates.set(id, template)
    return HttpResponse.json(template, { status: 201 })
  }),

  http.put('/api/settings/email-templates/:id', async ({ params, request }) => {
    await delay(150)
    const id = params.id as string
    const existing = templates.get(id)
    if (!existing) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Partial<Pick<EmailTemplate, 'name' | 'subject' | 'body' | 'category'>>
    const updated: EmailTemplate = {
      ...existing,
      ...body,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    }
    templates.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.delete('/api/settings/email-templates/:id', async ({ params }) => {
    await delay(100)
    const id = params.id as string
    if (!templates.has(id)) return new HttpResponse(null, { status: 404 })
    templates.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),
]
