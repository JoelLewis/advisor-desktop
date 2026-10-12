import { http, HttpResponse } from 'msw'
import type { AgentId, BindingAct, Directory, Draft, Message, ThreadDetail } from '@/types/workspace'
import { AGENTS, PEOPLE, can, permissionsOf, personById } from '../data/people'
import { nextAt, nextId, store } from '../data/workspace-store'
import { sendToClient } from '../workspace/acts'
import { carryFinding } from '../workspace/carry'
import { draftLetter, draftsFor, reviseDraft } from '../workspace/letters'
import { approveProposal, visibleProposal, withdrawApproval } from '../workspace/proposal-acts'
import { previewAgent, runAgent } from '../workspace/run-agent'
import { canSeeThread, viewerFrom, visibleThreads } from '../workspace/visibility'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal, unauthorised } from './workspace-http'
import { workspaceProposalHandlers } from './workspace-proposals'

const fullDirectory = (): Directory => ({ people: [...PEOPLE], agents: [...AGENTS], permissions: Object.fromEntries(PEOPLE.map((p) => [p.id, permissionsOf(p.id)])) })

function clientDirectory(clientId: string): Directory {
  const ids = new Set([clientId])
  for (const thread of visibleThreads(clientId)) thread.memberIds.forEach((id) => ids.add(id))
  return { people: PEOPLE.filter((p) => ids.has(p.id)), agents: [], permissions: { [clientId]: permissionsOf(clientId) } }
}

const withoutProvenance = ({ subject: _subject, basis: _basis, editedBy: _editedBy, ...act }: BindingAct): BindingAct => act

const isAgentId = (value: string): value is AgentId => AGENTS.some((a) => a.id === value)

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
    return HttpResponse.json(draftsFor(thread.id))
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
    const acts = store().acts.filter((a) => a.threadId === thread.id)
    // A client sees the record of what reached them, not what it was made from (the firm's draft, its proposal, its editors).
    return HttpResponse.json(personById(viewer)?.role === 'client' ? acts.map(withoutProvenance) : acts)
  }),

  http.post('/api/workspace/acts', async ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    if (!body || typeof body.kind !== 'string') return badRequest('kind must be a string.')
    const isClient = personById(viewer)?.role === 'client'
    switch (body.kind) {
      case 'send_to_client': {
        if (!nonEmptyString(body.draftId)) return badRequest('draftId must be a string.')
        const r = sendToClient(viewer, body.draftId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'approve_proposal': {
        if (isClient) return notFound()
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        if (!visibleProposal(viewer, body.proposalId)) return notFound()
        if (typeof body.version !== 'number' || !nonEmptyString(body.fingerprint)) return badRequest('version (a number) and fingerprint are required.')
        const r = approveProposal(viewer, body.proposalId, body.version, body.fingerprint)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'withdraw_approval': {
        if (isClient) return notFound()
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        const r = withdrawApproval(viewer, body.proposalId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      default:
        return HttpResponse.json({ code: 'NOT_IN_PHASE', message: 'That act is not recorded in this phase.' }, { status: 400 })
    }
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

  http.get('/api/workspace/threads/:id/agents/:agentId/preview', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const agentId = String(params.agentId)
    if (!isAgentId(agentId)) return HttpResponse.json({ code: 'NOT_ON_THREAD', message: 'That agent is not on this thread.' }, { status: 403 })
    const result = previewAgent(viewer, String(params.id), agentId)
    if (!result.ok) return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    return HttpResponse.json(result.findings)
  }),

  http.post('/api/workspace/threads/:id/drafts/letter', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const proposalId = body && nonEmptyString(body.proposalId) ? body.proposalId : undefined
    // The engine checks the thread before the proposal, so a missing proposalId surfaces as 400 only to a viewer who may draft here.
    const r = draftLetter(viewer.viewerId, String(params.id), proposalId ?? '')
    if (r.ok) return HttpResponse.json(r.draft, { status: r.created ? 201 : 200 })
    return proposalId === undefined && r.code === 'NO_PROPOSAL' ? badRequest('proposalId is required.') : refusal(r)
  }),

  http.post('/api/workspace/threads/:id/drafts/:draftId/revisions', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    // A missing body reaches the engine as empty text, which it refuses with 400 only after the thread and draft checks.
    const text = body && typeof body.body === 'string' ? body.body : ''
    const r = reviseDraft(viewer.viewerId, String(params.id), String(params.draftId), text)
    return r.ok ? HttpResponse.json(r.draft, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/threads/:id/findings/:messageId/carry', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    if (!body || !nonEmptyString(body.toThreadId)) {
      const from = store().threads.find((t) => t.id === params.id)
      return from && canSeeThread(viewer.viewerId, from) ? badRequest('toThreadId is required.') : notFound()
    }
    const r = carryFinding(viewer.viewerId, String(params.id), String(params.messageId), body.toThreadId)
    return r.ok ? HttpResponse.json(r.message, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  ...workspaceProposalHandlers,

  // Workspace handlers must be registered above this catch-all.
  http.all('/api/workspace/*', () => HttpResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'Workspace records cannot be edited or deleted.' }, { status: 405 })),
]
