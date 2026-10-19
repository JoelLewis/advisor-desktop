import type { BindingAct } from '@/types/workspace'
import type { Meeting, MeetingTask } from '@/types/workspace-meeting'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { recordAct } from './proposal-acts'
import { meetingTitle, notesFingerprint, refuseMeeting, replaceMeeting, visibleMeeting, type MeetingFailure } from './meetings'

/**
 * The meeting's record. Advisor only; only once the meeting is held and its notes drafted; once;
 * against the fingerprint of the notes as the advisor read them. The record keeps the lines exactly as
 * they stood, and each filed follow-up becomes a tracked task.
 */
export function fileMeetingRecord(viewerId: string, eventId: string, fingerprint: string): { ok: true; act: BindingAct } | MeetingFailure {
  const meeting = visibleMeeting(viewerId, eventId)
  if (!meeting) return refuseMeeting(404, 'NO_MEETING', 'Meeting not found.')
  if (!can(viewerId, 'file_meeting_record')) return refuseMeeting(403, 'NOT_PERMITTED', 'Only the advisor files the meeting record.')
  if (meeting.filed) return refuseMeeting(409, 'ALREADY_FILED', `The record was already filed (${meeting.filed.actId}).`)
  if (meeting.state !== 'held') return refuseMeeting(409, 'NOT_HELD', 'Hold the meeting, and draft its notes, before filing the record.')
  if (!meeting.notesDraft) return refuseMeeting(409, 'NO_NOTES', 'Ask Meeting Notes for a draft first.')
  const current = notesFingerprint(meeting.notesDraft)
  if (fingerprint !== current) return refuseMeeting(409, 'FINGERPRINT_MISMATCH', 'The notes changed since you read them. Open them again before filing.')
  const incomplete = meeting.notesDraft.find((l) => l.section === 'follow_ups' && (!l.owner || l.due === undefined))
  if (incomplete) throw new Error(`Follow-up ${incomplete.id} reached filing without an owner and a due date`)

  const lines = meeting.notesDraft.map((l) => ({ ...l, cites: [...l.cites] }))
  const act: BindingAct = {
    id: commitActId(), kind: 'file_meeting_record', actorId: viewerId, at: nextAt(), threadId: meeting.threadId,
    subject: { type: 'meeting', id: meeting.eventId }, fingerprint: current, summary: `Filed the record of the ${meetingTitle(meeting)}`,
  }
  recordAct(act)
  const tasks: MeetingTask[] = lines.flatMap((l) => (l.section === 'follow_ups' && l.owner && l.due !== undefined
    ? [{ id: `task-${pad(nextNumber('task'))}`, title: l.text, owner: l.owner, due: l.due, state: 'open' as const, fromNoteLine: l.id }]
    : []))
  const filed: Meeting = { ...meeting, state: 'filed', filed: { actId: act.id, fingerprint: current, lines }, tasks }
  replaceMeeting(filed)
  store().messages.push({ kind: 'meeting_tasks', id: nextId('msg'), threadId: meeting.threadId, at: nextAt(), eventId: meeting.eventId, filedActId: act.id, tasks })
  return { ok: true, act }
}
