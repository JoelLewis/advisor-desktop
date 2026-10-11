import { http, HttpResponse } from 'msw'
import type { AgentId, Directory, Draft, Message, ThreadDetail } from '@/types/workspace'
import { AGENTS, PEOPLE, can, permissionsOf, personById } from '../data/people'
import { nextAt, nextId, store } from '../data/workspace-store'
import { sendToClient } from '../workspace/acts'
import { runAgent } from '../workspace/run-agent'
import { canSeeThread, viewerFrom, visibleThreads } from '../workspace/visibility'
import { notFound } from './utils'

const fullDirectory = (): Directory => ({ people: [...PEOPLE], agents: [...AGENTS], permissions: Object.fromEntries(PEOPLE.map((p) => [p.id, permissionsOf(p.id)])) })

function clientDirectory(clientId: string): Directory {
  const ids = new Set([clientId])
  for (const thread of visibleThreads(clientId)) thread.memberIds.forEach((id) => ids.add(id))
  return { people: PEOPLE.filter((p) => ids.has(p.id)), agents: [], permissions: { [clientId]: permissionsOf(clientId) } }
}

const badRequest = (message: string) => HttpResponse.json({ code: 'BAD_REQUEST', message }, { status: 400 })

async function readJson(request: Request): Promise<Record<string, unknown> | undefined> {
  const parsed: unknown = await request.json().catch(() => undefined)
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
}

const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isAgentId = (value: string): value is AgentId => AGENTS.some((a) => a.id === value)

const unauthorised = () => HttpResponse.json({ code: 'NO_VIEWER', message: 'A known viewer is required.' }, { status: 401 })

export const workspaceHandlers = [
  http.get('/api/workspace/people', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    return HttpResponse.json(personById(viewer)?.role === 'client' ? clientDirectory(viewer) : fullDirectory())
  }),

  http.get('/api/workspace/threads', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    return HttpResponse.json(visibleThreads(viewer))
  }),

  http.get('/api/workspace/threads/:id', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const messages = store().messages.filter((m) => m.threadId === thread.id).sort((a, b) => a.at.localeCompare(b.at))
    const detail: ThreadDetail = { thread, messages }
    return HttpResponse.json(detail)
  }),

  http.post('/api/workspace/threads/:id/messages', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const isClient = personById(viewer)?.role === 'client'
    const allowed = thread.visibility === 'client'
      ? isClient && thread.clientId === viewer
      : !isClient && (thread.memberIds.includes(viewer) || thread.ownerId === viewer)
    if (!allowed) return HttpResponse.json({ code: 'NOT_PERMITTED', message: thread.visibility === 'client' ? 'Write a draft; sending to the client is a recorded act.' : 'Only members can post here.' }, { status: 403 })
    const json = await readJson(request)
    if (!json || !nonEmptyString(json.body)) return badRequest('A non-empty body is required.')
    const { body } = json
    const message: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewer, at: nextAt(), body }
    store().messages.push(message)
    return HttpResponse.json(message, { status: 201 })
  }),

  http.get('/api/workspace/threads/:id/drafts', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread) || personById(viewer)?.role === 'client') return notFound()
    return HttpResponse.json(store().drafts.filter((d) => d.clientThreadId === thread.id))
  }),

  http.post('/api/workspace/threads/:id/drafts', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread) || !can(viewer, 'draft_for_client')) return notFound()
    if (thread.visibility !== 'client') return HttpResponse.json({ code: 'NOT_CLIENT_THREAD', message: 'Drafts are for client threads.' }, { status: 400 })
    const json = await readJson(request)
    if (!json || !nonEmptyString(json.body)) return badRequest('A non-empty body is required.')
    const { body } = json
    const draft: Draft = { id: nextId('draft'), clientThreadId: thread.id, authorId: viewer, body, createdAt: nextAt() }
    store().drafts.push(draft)
    return HttpResponse.json(draft, { status: 201 })
  }),

  http.get('/api/workspace/acts', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const threadId = new URL(request.url).searchParams.get('threadId')
    const thread = store().threads.find((t) => t.id === threadId)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    return HttpResponse.json(store().acts.filter((a) => a.threadId === thread.id))
  }),

  http.post('/api/workspace/acts', async ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    if (!body || typeof body.kind !== 'string' || (body.draftId !== undefined && typeof body.draftId !== 'string')) return badRequest('kind (and draftId) must be strings.')
    if (body.kind !== 'send_to_client' || !body.draftId) return HttpResponse.json({ code: 'NOT_IN_PHASE', message: 'Only sending to a client is recorded in this phase.' }, { status: 400 })
    const result = sendToClient(viewer, body.draftId)
    if (!result.ok) return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    return HttpResponse.json(result.act, { status: 201 })
  }),

  http.post('/api/workspace/threads/:id/agents/:agentId/run', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const agentId = String(params.agentId)
    if (!isAgentId(agentId)) return HttpResponse.json({ code: 'NOT_ON_THREAD', message: 'That agent is not on this thread.' }, { status: 403 })
    const result = runAgent(viewer, String(params.id), agentId)
    if (!result.ok) return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    return HttpResponse.json(result.findings)
  }),

  // Workspace handlers must be registered above this catch-all.
  http.all('/api/workspace/*', () => HttpResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'Workspace records cannot be edited or deleted.' }, { status: 405 })),
]
