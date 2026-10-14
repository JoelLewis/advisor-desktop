
import type { VersionAuthor } from '@/types/workspace'
import type {
  AgendaItem, AgendaItemInput, AgendaVersion, Meeting, MeetingEvent, MeetingSummary, MeetingView, NoteLine, NoteLineInput, TaskOwner,
} from '@/types/workspace-meeting'
import { isNoteSection } from '@/types/workspace-meeting'
import { calendarEvents } from '@/mocks/data/calendar'
import { clients } from '@/mocks/data/clients'
import { AGENTS, can, personById } from '@/mocks/data/people'
import { transcriptOf } from '@/mocks/data/meeting-transcripts'
import { advanceClockTo, nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { minuteOf } from '@/lib/clock'
import { isCoveredTradingDay } from '@/lib/trading-calendar'
import { canSeeThread, isFirmViewer } from './visibility'

export type MeetingFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type MeetingResult = { ok: true; meeting: Meeting } | MeetingFailure

export const refuseMeeting = (status: MeetingFailure['status'], code: string, message: string): MeetingFailure => ({ ok: false, status, code, message })
const NO_MEETING = refuseMeeting(404, 'NO_MEETING', 'Meeting not found.')
const TITLE_MAX = 300
const toUtc = (local: string) => new Date(local).toISOString()

/** A firm person's name from the directory, a client's from the CRM (Patricia is a client, not a viewer). */
function nameOf(id: string): string {
  const name = personById(id)?.name ?? clients.find((c) => c.id === id)?.fullName
  if (name === undefined) throw new Error(`No person or client "${id}"`)
  return name
}

/** The calendar event behind a meeting, in UTC, its attendees named. Undefined for an event with no household. */
export function meetingEvent(eventId: string): MeetingEvent | undefined {
  const e = calendarEvents.find((x) => x.id === eventId)
  if (!e || e.householdId === undefined || e.clientId === undefined) return undefined
  return {
    id: e.id, title: e.title, start: toUtc(e.startTime), end: toUtc(e.endTime), ...(e.location ? { location: e.location } : {}),
    attendees: e.attendees.map((id) => ({ id, name: nameOf(id) })), householdId: e.householdId, clientId: e.clientId,
  }
}

function eventOf(meeting: Meeting): MeetingEvent {
  const event = meetingEvent(meeting.eventId)
  if (!event) throw new Error(`Meeting ${meeting.eventId} names no calendar event with a household`)
  return event
}

export const meetingOf = (eventId: string): Meeting | undefined => store().meetings.find((m) => m.eventId === eventId)

export function meetingTitle(meeting: Meeting): string {
  const thread = store().threads.find((t) => t.id === meeting.threadId)
  if (!thread) throw new Error(`Meeting ${meeting.eventId} names a missing thread ${meeting.threadId}`)
  return thread.title
}

/** The meeting a viewer may read: a firm viewer who can see its thread. A client, or anyone else, is told it does not exist. */
export function visibleMeeting(viewerId: string, eventId: string): Meeting | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const meeting = meetingOf(eventId)
  const thread = meeting && store().threads.find((t) => t.id === meeting.threadId)
  return meeting && thread && canSeeThread(viewerId, thread) ? meeting : undefined
}

function summaryOf(meeting: Meeting): MeetingSummary {
  const event = eventOf(meeting)
  return {
    eventId: meeting.eventId, title: meetingTitle(meeting), threadId: meeting.threadId, householdId: meeting.householdId, clientId: event.clientId,
    start: event.start, end: event.end, state: meeting.state, ...(meeting.filed ? { filedActId: meeting.filed.actId } : {}),
  }
}

/** The meetings a firm viewer may read; undefined for a client or an unknown viewer, whom the endpoint answers 404. */
export function meetingSummaries(viewerId: string): MeetingSummary[] | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  return store().meetings.filter((m) => visibleMeeting(viewerId, m.eventId) !== undefined).map(summaryOf)
}

/** The meeting as a firm viewer reads it; the transcript arrives only with the meeting held. */
export function meetingView(viewerId: string, eventId: string): MeetingView | undefined {
  const meeting = visibleMeeting(viewerId, eventId)
  if (!meeting) return undefined
  const transcript = meeting.state === 'scheduled' ? undefined : transcriptOf(meeting.eventId)
  return {
    ...summaryOf(meeting), event: eventOf(meeting), agenda: meeting.agenda, tasks: meeting.tasks,
    ...(meeting.heldAt ? { heldAt: meeting.heldAt } : {}),
    ...(meeting.notesDraft ? { notesDraft: meeting.notesDraft, notesFingerprint: notesFingerprint(meeting.notesDraft) } : {}),
    ...(meeting.filed ? { filed: meeting.filed } : {}),
    ...(transcript ? { transcript: [...transcript] } : {}),
  }
}

/**
 * What a filing fingerprints: every line's id, section, text, citations, owner and due date, in order, and
 * the client wording a line carries (what the client will read is part of what is filed).
 */
export function notesFingerprint(lines: readonly NoteLine[]): string {
  return fingerprint(JSON.stringify(lines.map((l) => [l.id, l.section, l.text, l.cites, l.owner ?? null, l.due ?? null, ...(l.toClient ? [l.toClient] : [])])))
}

/** A meeting the viewer may prepare: visible (else 404), and the viewer runs meetings (else 403). */
export function preparing(viewerId: string, eventId: string): MeetingResult {
  const meeting = visibleMeeting(viewerId, eventId)
  if (!meeting) return NO_MEETING
  if (!can(viewerId, 'prepare_meeting')) return refuseMeeting(403, 'NOT_PERMITTED', 'Only the advisor runs the meeting: prep, the agenda, holding it and its notes.')
  return { ok: true, meeting }
}

export function replaceMeeting(meeting: Meeting): void {
  const s = store()
  s.meetings = s.meetings.map((m) => (m.eventId === meeting.eventId ? meeting : m))
}

const currentAgenda = (meeting: Meeting): AgendaVersion | undefined => meeting.agenda[meeting.agenda.length - 1]

/** Appends an agenda version and posts its line in the meeting thread. */
export function appendAgenda(meeting: Meeting, items: AgendaItem[], author: VersionAuthor, changeSummary: string): Meeting {
  const at = nextAt()
  const version: AgendaVersion = { n: meeting.agenda.length + 1, items, author, at, changeSummary }
  const next: Meeting = { ...meeting, agenda: [...meeting.agenda, version] }
  replaceMeeting(next)
  store().messages.push({ kind: 'agenda_version', id: nextId('msg'), threadId: meeting.threadId, at, eventId: meeting.eventId, version: version.n, author, changeSummary })
  return next
}

/** What changed between two agendas, in words; undefined when nothing did. */
export function agendaChangeSummary(before: readonly AgendaItem[], after: readonly AgendaItem[]): string | undefined {
  const beforeIds = new Set(before.map((i) => i.id))
  const afterIds = new Set(after.map((i) => i.id))
  const added = after.filter((i) => !beforeIds.has(i.id)).map((i) => `Added “${i.title}”`)
  const dropped = before.filter((i) => !afterIds.has(i.id)).map((i) => `Dropped “${i.title}”`)
  const renamed = after.flatMap((i) => {
    const old = before.find((b) => b.id === i.id)
    return old && old.title !== i.title ? [`Renamed “${old.title}” to “${i.title}”`] : []
  })
  const keptOrder = (items: readonly AgendaItem[], other: ReadonlySet<string>) => items.filter((i) => other.has(i.id)).map((i) => i.id).join('|')
  const reordered = keptOrder(before, afterIds) !== keptOrder(after, beforeIds) ? ['Reordered the agenda'] : []
  const parts = [...added, ...dropped, ...renamed, ...reordered]
  return parts.length === 0 ? undefined : `${parts.join('; ')}.`
}

/** Checks a whole agenda before any id is allocated, so a refused write burns none. */
function checkedAgenda(meeting: Meeting, items: readonly AgendaItemInput[]): { ok: true; items: AgendaItem[] } | MeetingFailure {
  if (items.length === 0) return refuseMeeting(400, 'EMPTY_AGENDA', 'An agenda needs at least one item.')
  const current = new Set((currentAgenda(meeting)?.items ?? []).map((i) => i.id))
  const findings = new Set(store().messages
    .filter((m) => m.threadId === meeting.threadId && (m.kind === 'agent_finding' || m.kind === 'carried')).map((m) => m.id))
  const seen = new Set<string>()
  for (const item of items) {
    const title = item.title.trim()
    if (title.length === 0) return refuseMeeting(400, 'TITLE_REQUIRED', 'Every agenda item needs a title.')
    if (title.length > TITLE_MAX) return refuseMeeting(400, 'TITLE_TOO_LONG', `Keep an agenda title to ${TITLE_MAX} characters or fewer.`)
    if (item.id !== undefined) {
      if (!current.has(item.id)) return refuseMeeting(400, 'UNKNOWN_ITEM', `${item.id} is not on the current agenda.`)
      if (seen.has(item.id)) return refuseMeeting(400, 'DUPLICATE_ITEM', `${item.id} appears twice.`)
      seen.add(item.id)
    }
    if (item.source.kind === 'finding' && !findings.has(item.source.messageId)) {
      return refuseMeeting(400, 'UNKNOWN_FINDING', 'An agenda item can carry only a finding posted or carried into the meeting thread.')
    }
  }
  return { ok: true, items: items.map((i) => ({ id: i.id ?? `ag-${pad(nextNumber('agenda'))}`, title: i.title.trim(), source: i.source })) }
}

export function reviseAgenda(viewerId: string, eventId: string, items: readonly AgendaItemInput[]): MeetingResult {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state !== 'scheduled') return refuseMeeting(409, 'MEETING_HELD', 'The meeting has been held; its agenda is closed.')
  const before = currentAgenda(meeting)?.items ?? []
  // Reject an unchanged agenda before allocating ids: compare with ids resolved against the current agenda.
  const shapeOnly = items.map((i, n) => ({ id: i.id ?? `new-${n}`, title: i.title.trim(), source: i.source }))
  if (items.length > 0 && agendaChangeSummary(before, shapeOnly) === undefined) return refuseMeeting(400, 'NO_CHANGE', 'The agenda is unchanged.')
  const checked = checkedAgenda(meeting, items)
  if (!checked.ok) return checked
  const summary = agendaChangeSummary(before, checked.items)
  if (summary === undefined) throw new Error('An agenda that differs in shape must differ once ids are allocated')
  return { ok: true, meeting: appendAgenda(meeting, checked.items, { kind: 'person', personId: viewerId }, summary) }
}

/** Holds the meeting: the clock moves to its end (never backwards), the held line is posted, the transcript becomes readable. */
export function holdMeeting(viewerId: string, eventId: string): MeetingResult {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state !== 'scheduled') return refuseMeeting(409, 'ALREADY_HELD', 'The meeting was already held.')
  const event = eventOf(meeting)
  advanceClockTo(minuteOf(event.end) - 1)
  const at = nextAt()
  const held: Meeting = { ...meeting, state: 'held', heldAt: { start: event.start, end: event.end } }
  replaceMeeting(held)
  store().messages.push({ kind: 'meeting_held', id: nextId('msg'), threadId: meeting.threadId, at, eventId: meeting.eventId, start: event.start, end: event.end })
  return { ok: true, meeting: held }
}

const NOTE_TEXT_MAX = 2000

/** The meeting's calendar date where it happens (Eastern), from its event. */
export function meetingDay(meeting: Meeting): string {
  const event = calendarEvents.find((e) => e.id === meeting.eventId)
  if (!event) throw new Error(`Meeting ${meeting.eventId} names no calendar event`)
  return event.startTime.slice(0, 10)
}

const isOwner = (owner: TaskOwner): boolean => (owner.kind === 'person'
  ? isFirmViewer(owner.personId)
  : AGENTS.some((a) => a.id === owner.agentId))

/** Every line checked before anything is saved: section, text, citations, ids, and a follow-up's owner and due date. */
function lineRefusal(meeting: Meeting, input: readonly NoteLineInput[]): MeetingFailure | undefined {
  if (input.length === 0) return refuseMeeting(400, 'NO_LINES', 'The notes need at least one line.')
  const transcript = new Set((transcriptOf(meeting.eventId) ?? []).map((l) => l.id))
  const existing = new Set((meeting.notesDraft ?? []).map((l) => l.id))
  const day = meetingDay(meeting)
  const seen = new Set<string>()
  for (const line of input) {
    if (!isNoteSection(line.section)) return refuseMeeting(400, 'BAD_SECTION', 'A line belongs to discussion, decisions, client requests or follow-ups.')
    const text = line.text.trim()
    if (text.length === 0) return refuseMeeting(400, 'NOTE_TEXT_REQUIRED', 'Every line needs its text.')
    if (text.length > NOTE_TEXT_MAX) return refuseMeeting(400, 'NOTE_TEXT_TOO_LONG', `Keep a line to ${NOTE_TEXT_MAX} characters or fewer.`)
    if (line.cites.length === 0) return refuseMeeting(400, 'CITATION_REQUIRED', 'Every line cites the transcript line it records.')
    const unknown = line.cites.find((id) => !transcript.has(id))
    if (unknown !== undefined) return refuseMeeting(400, 'UNKNOWN_CITATION', `${unknown} is not a line of the transcript.`)
    if (line.id !== undefined) {
      if (!existing.has(line.id)) return refuseMeeting(400, 'UNKNOWN_LINE', `${line.id} is not a line of the draft.`)
      if (seen.has(line.id)) return refuseMeeting(400, 'DUPLICATE_LINE', `${line.id} appears twice.`)
      seen.add(line.id)
    }
    if (line.toClient !== undefined) {
      if (line.section !== 'decisions' && line.section !== 'client_requests') return refuseMeeting(400, 'CLIENT_WORDING_ONLY_ON_CLIENT_LINE', 'Only a decision or a client request has wording for the client.')
      if (!clients.some((c) => c.id === line.toClient?.clientId && c.householdId === meeting.householdId)) return refuseMeeting(400, 'UNKNOWN_CLIENT', 'Client wording is for a client of the meeting.')
      const worded = line.toClient.text.trim()
      if (worded.length === 0) return refuseMeeting(400, 'NOTE_TEXT_REQUIRED', 'Client wording needs its text.')
      if (worded.length > NOTE_TEXT_MAX) return refuseMeeting(400, 'NOTE_TEXT_TOO_LONG', `Keep a line to ${NOTE_TEXT_MAX} characters or fewer.`)
    }
    if (line.section !== 'follow_ups' && (line.owner !== undefined || line.due !== undefined)) {
      return refuseMeeting(400, 'OWNER_ONLY_ON_FOLLOW_UP', 'Only a follow-up has an owner and a due date.')
    }
    if (line.section === 'follow_ups') {
      if (!line.owner || line.due === undefined) return refuseMeeting(400, 'FOLLOW_UP_INCOMPLETE', 'A follow-up needs an owner and a due date.')
      if (!isOwner(line.owner)) return refuseMeeting(400, 'UNKNOWN_OWNER', 'A follow-up is owned by someone at the firm or by an agent.')
      if (!isCoveredTradingDay(line.due) || line.due < day) {
        return refuseMeeting(400, 'DUE_NOT_TRADING_DAY', `A due date is an NYSE trading day on or after the meeting (${day}), within the calendar the firm holds.`)
      }
    }
  }
  return undefined
}

/** The refusal for a record already filed; a filed meeting without its filing is a broken invariant. */
export function alreadyFiled(meeting: Meeting): MeetingFailure {
  if (!meeting.filed) throw new Error(`Meeting ${meeting.eventId} is filed but holds no filing`)
  return refuseMeeting(409, 'ALREADY_FILED', `The record was already filed (${meeting.filed.actId}); it cannot be edited.`)
}

/**
 * A line's client wording after an edit. New wording the edit names is taken as given. The line's own
 * wording — named again, or left out — stays only while the line's section and text are as they were:
 * once the advisor rewrites a line, the wording of the old text no longer speaks for it, and the recap
 * reads the line as filed.
 */
function clientWordingKept(input: NoteLineInput, was: NoteLine | undefined): NoteLine['toClient'] {
  const named = input.toClient && { clientId: input.toClient.clientId, text: input.toClient.text.trim() }
  const echoed = named !== undefined && was?.toClient !== undefined && named.clientId === was.toClient.clientId && named.text === was.toClient.text
  if (named && !echoed) return named
  return was?.toClient && was.section === input.section && was.text === input.text.trim() ? was.toClient : undefined
}

/** Adrian's edits to the notes draft, until it is filed. Nothing is saved unless every line passes. */
export function saveNotes(viewerId: string, eventId: string, input: readonly NoteLineInput[]): MeetingResult {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state === 'scheduled') return refuseMeeting(409, 'NOT_HELD', 'Hold the meeting first: the notes are drafted from its transcript.')
  if (meeting.state === 'filed') return alreadyFiled(meeting)
  if (!meeting.notesDraft) return refuseMeeting(409, 'NO_NOTES', 'Ask Meeting Notes for a draft first.')
  const refusal = lineRefusal(meeting, input)
  if (refusal) return refusal
  const before = new Map(meeting.notesDraft.map((l) => [l.id, l]))
  const lines: NoteLine[] = input.map((l) => {
    const toClient = clientWordingKept(l, l.id === undefined ? undefined : before.get(l.id))
    return {
      id: l.id ?? `n-${pad(nextNumber('note'))}`, section: l.section, text: l.text.trim(), cites: [...new Set(l.cites)],
      ...(l.section === 'follow_ups' && l.owner && l.due !== undefined ? { owner: l.owner, due: l.due } : {}),
      ...(toClient ? { toClient } : {}),
    }
  })
  const next: Meeting = { ...meeting, notesDraft: lines }
  replaceMeeting(next)
  return { ok: true, meeting: next }
}
