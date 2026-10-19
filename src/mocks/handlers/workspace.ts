import { http, HttpResponse } from 'msw'
import { isBreakResolution } from '@/types/reference-reconciliation'
import { isDisclosureDocument } from '@/types/workspace-prospect'
import { isSuitabilityReasonId, type SuitabilityReason } from '@/lib/suitability'
import type { AgentId, ConversationAudience, Directory, Draft, ListedThread, Message, ThreadDetail } from '@/types/workspace'
import { AGENTS, PEOPLE, can, permissionsOf } from '../data/people'
import { resolveBreak } from '../reference/reconciliation'
import { nextAt, nextId, store } from '../data/workspace-store'
import { BRIEF_THREAD_ID } from '@/lib/brief-thread'
import { briefOrder, remeasureBrief } from '../workspace/brief-remeasure'
import { briefToday } from '../workspace/brief-today'
import { settleApproved } from '../workspace/brief-groups'
import { suitablyApprovedAccounts } from '../workspace/suitability'
import { sendToParty } from '../workspace/acts'
import { storyProgress } from '../workspace/story-progress'
import { deliverDisclosure } from '../workspace/disclosures'
import { approveProspectProposal, sendProspectProposal } from '../workspace/prospect-acts'
import { prospectProposalById, visibleProspectProposal } from '../workspace/prospect-proposals'
import { visibleProspect } from '../workspace/prospects'
import { fileMeetingRecord } from '../workspace/meeting-acts'
import { startConversation } from '../workspace/conversations'
import { carryFinding } from '../workspace/carry'
import { draftLetter, draftsFor, reviseDraft } from '../workspace/letters'
import { approveProposal, visibleProposal, withdrawApproval } from '../workspace/proposal-acts'
import { previewAgent, runAgent } from '../workspace/run-agent'
import { canSeeThread, isExternalViewer, viewerFrom, visibleThreads } from '../workspace/visibility'
import { audienceOf } from '../workspace/party'
import { actsForOutsider, actsReaching, messageForOutsider, messagesForOutsider } from '../workspace/outsider-view'
import { rosterOf } from '../workspace/roster'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal, unauthorized, withoutProvenance } from './workspace-http'
import { workspaceMeetingHandlers } from './workspace-meetings'
import { workspaceProposalHandlers } from './workspace-proposals'
import { workspaceProspectHandlers } from './workspace-prospects'
import { workspaceReferenceHandlers } from './workspace-reference'
import { parseComplianceAct, recordComplianceAct, workspaceSupervisionHandlers } from './workspace-supervision'

/** The advisor's suitability reason, as sent: a listed reason and, if written, a note. The engine judges whether it holds. */
function parseSuitability(value: unknown): { ok: true; value?: SuitabilityReason } | { ok: false; message: string } {
  if (value === undefined) return { ok: true }
  if (typeof value !== 'object' || value === null) return { ok: false, message: 'suitability must be an object.' }
  const { reason, note } = value as Record<string, unknown>
  if (!isSuitabilityReasonId(reason)) return { ok: false, message: 'suitability.reason must be one of the listed reasons.' }
  if (note !== undefined && typeof note !== 'string') return { ok: false, message: 'suitability.note must be text.' }
  return { ok: true, value: { reason, ...(note !== undefined ? { note } : {}) } }
}

function parseAudience(value: unknown): ConversationAudience | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { kind, clientId } = value as Record<string, unknown>
  if (kind === 'private' || kind === 'internal') return { kind }
  return kind === 'client' && nonEmptyString(clientId) ? { kind, clientId } : undefined
}

const fullDirectory = (): Directory => ({ people: [...PEOPLE], agents: [...AGENTS], permissions: Object.fromEntries(PEOPLE.map((p) => [p.id, permissionsOf(p.id)])) })

/** An outsider's directory: themselves and the people in their own thread. No agents, no firm permissions. */
function externalDirectory(partyId: string): Directory {
  const ids = new Set([partyId])
  for (const thread of visibleThreads(partyId)) thread.memberIds.forEach((id) => ids.add(id))
  return { people: PEOPLE.filter((p) => ids.has(p.id)), agents: [], permissions: { [partyId]: permissionsOf(partyId) } }
}

const isAgentId = (value: string): value is AgentId => AGENTS.some((a) => a.id === value)

export const workspaceHandlers = [
  http.get('/api/workspace/story', ({ request }) => {
    const viewer = firmViewer(request)
    return viewer.ok ? HttpResponse.json(storyProgress()) : viewer.response
  }),

  http.get('/api/workspace/people', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    return HttpResponse.json(isExternalViewer(viewer) ? externalDirectory(viewer) : fullDirectory())
  }),

  http.get('/api/workspace/threads', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const listed: ListedThread[] = visibleThreads(viewer).map((t) => ({ ...t, audience: audienceOf(t) }))
    return HttpResponse.json(listed)
  }),

  http.post('/api/workspace/threads', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const audience = parseAudience(body?.audience)
    if (!body || !nonEmptyString(body.householdId) || typeof body.title !== 'string' || !audience) {
      return badRequest('householdId, a title and an audience (private, internal, or client with a clientId) are required.')
    }
    const r = startConversation(viewer.viewerId, { householdId: body.householdId, title: body.title, audience })
    return r.ok ? HttpResponse.json({ thread: r.thread, created: r.created }, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  http.get('/api/workspace/threads/:id', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    if (thread.id === BRIEF_THREAD_ID) remeasureBrief()
    const inThread = store().messages.filter((m) => m.threadId === thread.id)
    const messages = thread.id === BRIEF_THREAD_ID
      ? [briefToday(viewer), ...briefOrder(inThread).map((m) => (m.kind === 'brief_summary' ? settleApproved(m, suitablyApprovedAccounts()) : m))]
      : inThread.sort((a, b) => a.at.localeCompare(b.at))
    const detail: ThreadDetail = { thread, messages: isExternalViewer(viewer) ? messagesForOutsider(thread.id, messages) : messages, audience: audienceOf(thread), roster: rosterOf(thread, viewer) }
    return HttpResponse.json(detail)
  }),

  http.post('/api/workspace/threads/:id/messages', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const external = isExternalViewer(viewer)
    const allowed = thread.visibility === 'client'
      ? external && thread.partyId === viewer
      : !external && (thread.memberIds.includes(viewer) || thread.ownerId === viewer)
    if (!allowed) return HttpResponse.json({ code: 'NOT_PERMITTED', message: thread.visibility === 'client' ? 'Write a draft; sending is a recorded act.' : 'Only members can post here.' }, { status: 403 })
    const json = await readJson(request)
    if (!json || !nonEmptyString(json.body)) return badRequest('A non-empty body is required.')
    const { body } = json
    const message: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewer, at: nextAt(), body }
    store().messages.push(message)
    return HttpResponse.json(external ? messageForOutsider(message) : message, { status: 201 })
  }),

  http.get('/api/workspace/threads/:id/drafts', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread) || isExternalViewer(viewer)) return notFound()
    return HttpResponse.json(draftsFor(thread.id))
  }),

  http.post('/api/workspace/threads/:id/drafts', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
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
    if (!viewer) return unauthorized()
    const threadId = new URL(request.url).searchParams.get('threadId')
    const thread = store().threads.find((t) => t.id === threadId)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const acts = actsReaching(thread.id)
    // An outsider sees the record of what reached them, not what it was made from (the firm's draft, its proposal, its editors) nor how the firm reviewed it.
    return HttpResponse.json(isExternalViewer(viewer)
      ? actsForOutsider(thread.id, acts.map(withoutProvenance))
      : acts)
  }),

  http.post('/api/workspace/acts', async ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    // An outsider is told the surface does not exist before anything about the body is read.
    if (isExternalViewer(viewer)) return notFound()
    const body = await readJson(request)
    if (!body || typeof body.kind !== 'string') return badRequest('kind must be a string.')
    switch (body.kind) {
      case 'send_to_party': {
        if (nonEmptyString(body.proposalId)) {
          const r = sendProspectProposal(viewer, body.proposalId)
          return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
        }
        if (!nonEmptyString(body.draftId)) return badRequest('draftId or proposalId is required.')
        const r = sendToParty(viewer, body.draftId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'deliver_disclosure': {
        if (!nonEmptyString(body.prospectId)) return badRequest('prospectId is required.')
        if (!visibleProspect(viewer, body.prospectId)) return notFound()
        if (!isDisclosureDocument(body.document)) return badRequest('document must be form_crs, adv_2a, adv_2b or privacy_notice.')
        const r = deliverDisclosure(viewer, body.prospectId, body.document)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'approve_proposal': {
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        if (prospectProposalById(body.proposalId)) {
          if (!visibleProspectProposal(viewer, body.proposalId)) return notFound()
          if (typeof body.version !== 'number' || !nonEmptyString(body.fingerprint) || typeof body.rationale !== 'string') {
            return badRequest('version (a number), fingerprint and rationale are required.')
          }
          const r = approveProspectProposal(viewer, body.proposalId, body.version, body.fingerprint, body.rationale)
          return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
        }
        if (!visibleProposal(viewer, body.proposalId)) return notFound()
        if (typeof body.version !== 'number' || !nonEmptyString(body.fingerprint)) return badRequest('version (a number) and fingerprint are required.')
        const suitability = parseSuitability(body.suitability)
        if (!suitability.ok) return badRequest(suitability.message)
        const r = approveProposal(viewer, body.proposalId, body.version, body.fingerprint, suitability.value)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'withdraw_approval': {
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        const r = withdrawApproval(viewer, body.proposalId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'file_meeting_record': {
        if (!nonEmptyString(body.eventId) || !nonEmptyString(body.fingerprint)) return badRequest('eventId and fingerprint are required.')
        const r = fileMeetingRecord(viewer, body.eventId, body.fingerprint)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'release_orders':
      case 'return_to_advisor':
      case 'escalate':
      case 'dispose_alert':
      case 'review_correspondence': {
        const parsed = parseComplianceAct(body)
        if (!parsed.ok) return badRequest(parsed.message)
        const r = recordComplianceAct(viewer, parsed.request)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'resolve_break': {
        if (!nonEmptyString(body.breakId) || !nonEmptyString(body.fingerprint) || !isBreakResolution(body.resolution) || typeof body.rationale !== 'string') {
          return badRequest('breakId, fingerprint, a resolution (book_corrected, custodian_corrected or timing_difference) and a rationale are required.')
        }
        const r = resolveBreak(viewer, { breakId: body.breakId, fingerprint: body.fingerprint, resolution: body.resolution, rationale: body.rationale })
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      default:
        return HttpResponse.json({ code: 'UNKNOWN_ACT', message: 'That is not a recorded act.' }, { status: 400 })
    }
  }),

  http.post('/api/workspace/threads/:id/agents/:agentId/run', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const agentId = String(params.agentId)
    if (!isAgentId(agentId)) return HttpResponse.json({ code: 'NOT_ON_THREAD', message: 'That agent is not on this thread.' }, { status: 403 })
    const result = runAgent(viewer, String(params.id), agentId)
    if (!result.ok) return HttpResponse.json({ code: result.code, message: result.message }, { status: result.status })
    return HttpResponse.json(result.findings)
  }),

  http.get('/api/workspace/threads/:id/agents/:agentId/preview', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
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
  ...workspaceSupervisionHandlers,
  ...workspaceMeetingHandlers,
  ...workspaceProspectHandlers,
  ...workspaceReferenceHandlers,

  // Workspace handlers must be registered above this catch-all.
  http.all('/api/workspace/*', () => HttpResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'Workspace records cannot be edited or deleted.' }, { status: 405 })),
]
