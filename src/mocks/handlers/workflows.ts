import { http, HttpResponse, delay } from 'msw'
import { tasks, processTrackers, workflowTemplates } from '../data/workflows'
import { notFound } from './utils'
import type { WorkflowTemplate } from '@/types/workflow'

// Mutable copy for CRUD
const templateStore = new Map<string, WorkflowTemplate>(
  workflowTemplates.map((t) => [t.id, t]),
)

export const workflowHandlers = [
  http.get('/api/workflows/my-actions', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    let filtered = tasks.filter((t) => t.assignee === 'Sarah Mitchell')
    if (status) filtered = filtered.filter((t) => t.status === status)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/workflows/in-process', () => {
    return HttpResponse.json(processTrackers)
  }),

  http.get('/api/workflows/delegated', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('delegationType')
    let filtered = tasks.filter((t) => t.assignee !== 'Sarah Mitchell')
    if (type) filtered = filtered.filter((t) => t.delegationType === type)
    return HttpResponse.json(filtered)
  }),

  http.get('/api/workflows/templates', () => {
    return HttpResponse.json(Array.from(templateStore.values()))
  }),

  http.post('/api/workflows/templates', async ({ request }) => {
    await delay(200)
    const body = await request.json() as Omit<WorkflowTemplate, 'id'>
    const id = `tpl-${Date.now()}`
    const template: WorkflowTemplate = { id, ...body }
    templateStore.set(id, template)
    return HttpResponse.json(template, { status: 201 })
  }),

  http.put('/api/workflows/templates/:id', async ({ params, request }) => {
    await delay(150)
    const id = params.id as string
    const existing = templateStore.get(id)
    if (!existing) return notFound()
    const body = await request.json() as Partial<WorkflowTemplate>
    const updated = { ...existing, ...body, id }
    templateStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.delete('/api/workflows/templates/:id', async ({ params }) => {
    await delay(100)
    const id = params.id as string
    if (!templateStore.has(id)) return notFound()
    templateStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.put('/api/workflows/tasks/:taskId', async ({ params, request }) => {
    const body = await request.json() as Partial<typeof tasks[0]>
    const task = tasks.find((t) => t.id === params.taskId)
    if (!task) return notFound()
    return HttpResponse.json({ ...task, ...body })
  }),

  http.post('/api/workflows/tasks/:taskId/delegate', async ({ params, request }) => {
    const body = await request.json() as { delegateTo: string; delegationType: string }
    const task = tasks.find((t) => t.id === params.taskId)
    if (!task) return notFound()
    return HttpResponse.json({ ...task, assignee: body.delegateTo, delegationType: body.delegationType })
  }),

  http.post('/api/workflows/tasks', async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { title: string; priority: string; dueDate: string; clientId?: string; clientName?: string }
    return HttpResponse.json({
      id: `task-new-${Date.now()}`,
      title: body.title,
      description: '',
      status: 'pending',
      priority: body.priority,
      assignee: 'Sarah Mitchell',
      delegationType: 'team_member',
      clientId: body.clientId,
      clientName: body.clientName,
      category: 'administrative',
      dueDate: body.dueDate,
      createdAt: new Date().toISOString(),
    })
  }),

  http.post('/api/workflows/start', async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { templateId: string; clientId?: string; clientName?: string; priority: string }
    return HttpResponse.json({
      id: `task-wf-${Date.now()}`,
      title: `Workflow started from template ${body.templateId}`,
      description: '',
      status: 'in_progress',
      priority: body.priority,
      assignee: 'Sarah Mitchell',
      delegationType: 'team_member',
      clientId: body.clientId,
      clientName: body.clientName,
      category: 'administrative',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    })
  }),
]
