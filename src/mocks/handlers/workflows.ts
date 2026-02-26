import { http, HttpResponse } from 'msw'
import { tasks, processTrackers, workflowTemplates } from '../data/workflows'

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
    return HttpResponse.json(workflowTemplates)
  }),

  http.put('/api/workflows/tasks/:taskId', async ({ params, request }) => {
    const body = await request.json() as Partial<typeof tasks[0]>
    const task = tasks.find((t) => t.id === params.taskId)
    if (!task) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ ...task, ...body })
  }),

  http.post('/api/workflows/tasks/:taskId/delegate', async ({ params, request }) => {
    const body = await request.json() as { delegateTo: string; delegationType: string }
    const task = tasks.find((t) => t.id === params.taskId)
    if (!task) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ ...task, assignee: body.delegateTo, delegationType: body.delegationType })
  }),
]
