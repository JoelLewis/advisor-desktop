import type { VersionAuthor } from './workspace'

/** Who speaks in a transcript: the household's clients and the advisor. */
export type TranscriptSpeaker = 'cli-001' | 'cli-002' | 'user-001'
export type TranscriptLine = { id: string; speaker: TranscriptSpeaker; text: string }

/** Where an agenda item came from: a finding (or a carried finding) in the meeting thread, or the advisor. */
export type AgendaSource = { kind: 'finding'; messageId: string } | { kind: 'advisor' }
export type AgendaItem = { id: string; title: string; source: AgendaSource }
/** An item as a write names it: an existing item keeps its id; a new one has none yet. */
export type AgendaItemInput = { id?: string; title: string; source: AgendaSource }
/** Append-only: each change to the agenda is a new version. */
export type AgendaVersion = { n: number; items: AgendaItem[]; author: VersionAuthor; at: string; changeSummary: string }

export const NOTE_SECTIONS = ['discussion', 'decisions', 'client_requests', 'follow_ups'] as const
export type NoteSection = (typeof NOTE_SECTIONS)[number]
export const isNoteSection = (value: unknown): value is NoteSection =>
  typeof value === 'string' && (NOTE_SECTIONS as readonly string[]).includes(value)

/** Who owns a follow-up: a person at the firm or an agent. */
export type TaskOwner = VersionAuthor
/**
 * A decision or client request as one client reads it in the recap: the same meaning, addressed to them
 * ("you" for the firm's "Robert"), resting on the line's own citations. It is part of the filed record.
 */
export type ClientWording = { clientId: string; text: string }
/**
 * One line of the notes. `cites` names the transcript lines it records (at least one). A follow-up
 * also carries its owner — as stated in the meeting, cited — and its due date, an NYSE trading day.
 * A decision or client request may carry its wording for the client it names (`toClient`).
 */
export type NoteLine = { id: string; section: NoteSection; text: string; cites: string[]; owner?: TaskOwner; due?: string; toClient?: ClientWording }
/**
 * A line as an edit names it: an existing line keeps its id; a new one has none yet. Without `toClient`,
 * an existing line keeps its client wording only while its section and text are unchanged.
 */
export type NoteLineInput = { id?: string; section: NoteSection; text: string; cites: string[]; owner?: TaskOwner; due?: string; toClient?: ClientWording }

/** A follow-up tracked from the filed record. Nobody but the presenter acts live, so tasks are tracked, not worked. */
export type MeetingTask = { id: string; title: string; owner: TaskOwner; due: string; state: 'open' | 'done'; fromNoteLine: string }

export type MeetingState = 'scheduled' | 'held' | 'filed'
/** The record as filed: the note lines exactly as they stood, and the fingerprint the act recorded. */
export type MeetingFiling = { actId: string; fingerprint: string; lines: NoteLine[] }

/** The session's meeting: its state machine, its agenda versions, the notes draft, the filing and the tasks. */
export type Meeting = {
  eventId: string
  householdId: string
  threadId: string
  state: MeetingState
  agenda: AgendaVersion[]
  heldAt?: { start: string; end: string }
  notesDraft?: NoteLine[]
  filed?: MeetingFiling
  tasks: MeetingTask[]
}

type Attendee = { id: string; name: string }
/** The calendar event, in UTC, with its attendees named. */
export type MeetingEvent = { id: string; title: string; start: string; end: string; location?: string; attendees: Attendee[]; householdId: string; clientId: string }

export type MeetingSummary = {
  eventId: string
  /** The meeting thread's title, e.g. "Johnson annual review". */
  title: string
  threadId: string
  householdId: string
  clientId: string
  start: string
  end: string
  state: MeetingState
  filedActId?: string
}

/** The meeting as a firm viewer reads it. The transcript is served only once the meeting is held. */
export type MeetingView = MeetingSummary & {
  event: MeetingEvent
  agenda: AgendaVersion[]
  heldAt?: { start: string; end: string }
  notesDraft?: NoteLine[]
  /** The fingerprint `file_meeting_record` must name: the notes draft as it stands. */
  notesFingerprint?: string
  filed?: MeetingFiling
  tasks: MeetingTask[]
  transcript?: TranscriptLine[]
}
