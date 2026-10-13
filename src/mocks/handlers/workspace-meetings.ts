import { http, HttpResponse } from 'msw'
import type { AgendaItemInput, AgendaSource, ClientWording, NoteLineInput, TaskOwner } from '@/types/workspace-meeting'
import { isNoteSection } from '@/types/workspace-meeting'
import { AGENTS } from '../data/people'
import { holdMeeting, meetingSummaries, meetingView, reviseAgenda, saveNotes } from '../workspace/meetings'
import { draftMeetingNotes, runMeetingPrep } from '../workspace/meeting-agents'
import { draftRecap } from '../workspace/recap'
import { clientView, householdView } from '../workspace/household-views'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal } from './workspace-http'

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((x) => typeof x === 'string')

function parseSource(value: unknown): AgendaSource | undefined {
  if (!isRecord(value)) return undefined
  if (value.kind === 'advisor') return { kind: 'advisor' }
  return value.kind === 'finding' && nonEmptyString(value.messageId) ? { kind: 'finding', messageId: value.messageId } : undefined
}

/** An agenda body, checked for shape; the engine decides everything else. */
export function parseAgendaItems(value: unknown): { ok: true; items: AgendaItemInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'items must be a list.' }
  const items: AgendaItemInput[] = []
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.title !== 'string') return { ok: false, message: 'Each item needs a title.' }
    const source = parseSource(raw.source)
    if (!source) return { ok: false, message: 'Each item needs a source: the advisor, or a finding by its message id.' }
    if (raw.id !== undefined && !nonEmptyString(raw.id)) return { ok: false, message: 'An item id is a string.' }
    items.push({ ...(typeof raw.id === 'string' ? { id: raw.id } : {}), title: raw.title, source })
  }
  return { ok: true, items }
}

function parseOwner(value: unknown): Parsed<TaskOwner | undefined> {
  if (value === undefined) return { ok: true, value: undefined }
  if (isRecord(value) && value.kind === 'person' && nonEmptyString(value.personId)) return { ok: true, value: { kind: 'person', personId: value.personId } }
  if (isRecord(value) && value.kind === 'agent') {
    const agent = AGENTS.find((a) => a.id === value.agentId)
    if (agent) return { ok: true, value: { kind: 'agent', agentId: agent.id } }
  }
  return { ok: false, message: 'An owner is a person or an agent.' }
}

function parseClientWording(value: unknown): { ok: true; value?: ClientWording } | { ok: false; message: string } {
  if (value === undefined) return { ok: true }
  if (isRecord(value) && nonEmptyString(value.clientId) && typeof value.text === 'string') return { ok: true, value: { clientId: value.clientId, text: value.text } }
  return { ok: false, message: 'Client wording names the client and its text.' }
}

/** A notes body, checked for shape; the engine checks the citations, the owners and the due dates. */
export function parseNoteLines(value: unknown): { ok: true; lines: NoteLineInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'lines must be a list.' }
  const lines: NoteLineInput[] = []
  for (const raw of value) {
    if (!isRecord(raw) || !isNoteSection(raw.section) || typeof raw.text !== 'string' || !isStringList(raw.cites)) {
      return { ok: false, message: 'Each line needs a section (discussion, decisions, client_requests or follow_ups), its text and its citations.' }
    }
    if (raw.id !== undefined && !nonEmptyString(raw.id)) return { ok: false, message: 'A line id is a string.' }
    if (raw.due !== undefined && typeof raw.due !== 'string') return { ok: false, message: 'A due date is a string.' }
    const owner = parseOwner(raw.owner)
    if (!owner.ok) return owner
    const toClient = parseClientWording(raw.toClient)
    if (!toClient.ok) return toClient
    lines.push({
      ...(typeof raw.id === 'string' ? { id: raw.id } : {}), section: raw.section, text: raw.text, cites: raw.cites,
      ...(owner.value ? { owner: owner.value } : {}), ...(typeof raw.due === 'string' ? { due: raw.due } : {}),
      ...(toClient.value ? { toClient: toClient.value } : {}),
    })
  }
  return { ok: true, lines }
}

const viewOf = (viewerId: string, eventId: string, status: number) => {
  const view = meetingView(viewerId, eventId)
  return view ? HttpResponse.json(view, { status }) : notFound()
}
/** A shape error is a 400 only for a viewer who may see the meeting; anyone else learns nothing. */
const shapeRefusal = (viewerId: string, eventId: string, message: string) => (meetingView(viewerId, eventId) ? badRequest(message) : notFound())

/** Firm surfaces: a client gets 404 from each before anything about the request is read. */
export const workspaceMeetingHandlers = [
  http.get('/api/workspace/meetings', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const meetings = meetingSummaries(viewer.viewerId)
    return meetings ? HttpResponse.json(meetings) : notFound()
  }),

  http.get('/api/workspace/meetings/:eventId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    return viewOf(viewer.viewerId, String(params.eventId), 200)
  }),

  http.post('/api/workspace/meetings/:eventId/prep', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = runMeetingPrep(viewer.viewerId, String(params.eventId))
    return r.ok ? viewOf(viewer.viewerId, String(params.eventId), r.created ? 201 : 200) : refusal(r)
  }),

  http.post('/api/workspace/meetings/:eventId/agenda', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const eventId = String(params.eventId)
    const parsed = parseAgendaItems((await readJson(request))?.items)
    if (!parsed.ok) return shapeRefusal(viewer.viewerId, eventId, parsed.message)
    const r = reviseAgenda(viewer.viewerId, eventId, parsed.items)
    return r.ok ? viewOf(viewer.viewerId, eventId, 201) : refusal(r)
  }),

  http.post('/api/workspace/meetings/:eventId/hold', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = holdMeeting(viewer.viewerId, String(params.eventId))
    return r.ok ? viewOf(viewer.viewerId, String(params.eventId), 200) : refusal(r)
  }),

  http.post('/api/workspace/meetings/:eventId/notes/draft', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = draftMeetingNotes(viewer.viewerId, String(params.eventId))
    return r.ok ? viewOf(viewer.viewerId, String(params.eventId), r.created ? 201 : 200) : refusal(r)
  }),

  http.put('/api/workspace/meetings/:eventId/notes', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const eventId = String(params.eventId)
    const parsed = parseNoteLines((await readJson(request))?.lines)
    if (!parsed.ok) return shapeRefusal(viewer.viewerId, eventId, parsed.message)
    const r = saveNotes(viewer.viewerId, eventId, parsed.lines)
    return r.ok ? viewOf(viewer.viewerId, eventId, 200) : refusal(r)
  }),

  http.get('/api/workspace/households/:householdId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const view = householdView(viewer.viewerId, String(params.householdId))
    return view ? HttpResponse.json(view) : notFound()
  }),

  http.get('/api/workspace/clients/:clientId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const view = clientView(viewer.viewerId, String(params.clientId))
    return view ? HttpResponse.json(view) : notFound()
  }),

  http.post('/api/workspace/threads/:id/drafts/recap', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const eventId = body && nonEmptyString(body.eventId) ? body.eventId : undefined
    // The engine checks the thread before the meeting, so a missing eventId surfaces as 400 only to a viewer who may draft here.
    const r = draftRecap(viewer.viewerId, String(params.id), eventId ?? '')
    if (r.ok) return HttpResponse.json(r.draft, { status: r.created ? 201 : 200 })
    return eventId === undefined && r.code === 'NO_MEETING' ? badRequest('eventId is required.') : refusal(r)
  }),
]
