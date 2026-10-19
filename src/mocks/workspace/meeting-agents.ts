import type { Message } from '@/types/workspace'
import type { AgendaItem, Meeting } from '@/types/workspace-meeting'
import { nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { AGENDA_V1_SUMMARY, runMeetingPrepAgent } from '@/mocks/agents/meeting-prep'
import { runKeyOf } from './run-key'
import { draftNotesFromTranscript, type NotesFacts, type RebalanceState } from '@/mocks/agents/meeting-notes'
import type { WholeStatus } from '@/types/reference-risk'
import { householdFixtures } from '@/mocks/data/households'
import { clientRiskOf } from '@/mocks/reference/risk'
import { householdLedgerAt, type HouseholdLedger } from './household-ledger'
import { isEasternMorning } from '@/lib/eastern-day'
import { alreadyFiled, appendAgenda, meetingDay, preparing, refuseMeeting, replaceMeeting, type MeetingFailure } from './meetings'

export type AgentMessage = Extract<Message, { kind: 'agent_finding' }>

/**
 * Meeting Prep in the meeting thread: its findings, measured now, and — when the agenda is still
 * empty — agenda v1, attention first. A repeat for the same book returns the earlier findings.
 */
export function runMeetingPrep(viewerId: string, eventId: string): { ok: true; meeting: Meeting; findings: AgentMessage[]; created: boolean } | MeetingFailure {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  let { meeting } = prepared
  if (meeting.state !== 'scheduled') return refuseMeeting(409, 'MEETING_HELD', 'The meeting has been held; prep is closed.')
  const runKey = runKeyOf('meeting-prep', meeting.threadId, { type: 'household', id: meeting.householdId })
  const s = store()
  const existing = s.messages.filter((m): m is AgentMessage => m.kind === 'agent_finding' && m.runKey === runKey)
  if (existing.length > 0) return { ok: true, meeting, findings: existing, created: false }

  const asOf = nextAt()
  const measured = runMeetingPrepAgent(meeting.householdId, asOf)
  const findings: AgentMessage[] = measured.map(({ agendaTitle: _title, ...finding }) => ({
    kind: 'agent_finding', id: nextId('msg'), threadId: meeting.threadId, agentId: 'meeting-prep', at: asOf, runKey, ...finding,
  }))
  s.messages.push(...findings)
  if (meeting.agenda.length === 0) {
    const paired = measured.map((finding, i) => ({ finding, messageId: findings[i]?.id }))
    // Stable: attention first, then the order the agent measured in.
    const ranked = [...paired].sort((a, b) => Number(b.finding.attention === 'attention') - Number(a.finding.attention === 'attention'))
    const items: AgendaItem[] = ranked.map(({ finding, messageId }) => {
      if (!messageId) throw new Error('Every measured finding is posted')
      return { id: `ag-${pad(nextNumber('agenda'))}`, title: finding.agendaTitle, source: { kind: 'finding', messageId } }
    })
    meeting = appendAgenda(meeting, items, { kind: 'agent', agentId: 'meeting-prep' }, AGENDA_V1_SUMMARY)
  }
  return { ok: true, meeting, findings, created: true }
}

/**
 * Whether the household's rebalance had filled in the ledger's reading (that morning, or later that day), was approved
 * and awaiting release, or was never approved. Read as of a meeting's end (`householdLedgerAt`), it is what the meeting knew.
 */
export function rebalanceStateOf(ledger: HouseholdLedger): RebalanceState {
  const fills = ledger.fillsOnDay.filter((f) => f.source.kind === 'proposal')
  if (fills.length > 0) return fills.every((f) => isEasternMorning(f.at)) ? 'filled_this_morning' : 'filled_today'
  return ledger.openOrders.some((o) => o.status === 'pending_compliance') ? 'awaiting_release' : 'not_approved'
}

/** A client's accounts as a whole against their own tolerance, as the Risk view reads them; none when the client holds no measured account. */
export function wholeStandingOf(clientId: string): { tolerance: string; status: WholeStatus; score: number; value: number } | undefined {
  const risk = clientRiskOf(clientId)
  if (!risk) return undefined
  const { status, tolerance } = risk.posture
  // A client's accounts as a whole are always measured (ClientRisk); a glide-path status here is a broken invariant.
  if (status === 'glide_path') throw new Error(`${clientId}'s accounts as a whole carry a glide-path status`)
  return { tolerance: tolerance.band, status, score: risk.posture.score, value: risk.value }
}

/** What the ledger showed for the household when the meeting ended (`end`), and what the Risk view shows: the notes are checked against it. */
export function notesFactsOf(householdId: string, end: string): NotesFacts {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  const wholes = new Map(household.members.flatMap((m) => {
    const standing = wholeStandingOf(m.clientId)
    return standing ? [[m.clientId, { tolerance: standing.tolerance, status: standing.status }] as const] : []
  }))
  return { rebalance: rebalanceStateOf(householdLedgerAt(householdId, end)), wholes }
}

/** Meeting Notes drafts the record from the transcript, once the meeting is held; a second request keeps the draft as Adrian left it. */
export function draftMeetingNotes(viewerId: string, eventId: string): { ok: true; meeting: Meeting; created: boolean } | MeetingFailure {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state === 'scheduled') return refuseMeeting(409, 'NOT_HELD', 'Hold the meeting first: the notes are drafted from its transcript.')
  if (meeting.state === 'filed') return alreadyFiled(meeting)
  if (meeting.notesDraft) return { ok: true, meeting, created: false }
  if (!meeting.heldAt) throw new Error(`Meeting ${meeting.eventId} is held but records no time it was held`)
  const next: Meeting = { ...meeting, notesDraft: draftNotesFromTranscript(meeting.eventId, meetingDay(meeting), notesFactsOf(meeting.householdId, meeting.heldAt.end)) }
  replaceMeeting(next)
  store().messages.push({ kind: 'notes_drafted', id: nextId('msg'), threadId: meeting.threadId, at: nextAt(), eventId: meeting.eventId, agentId: 'meeting-notes' })
  return { ok: true, meeting: next, created: true }
}
