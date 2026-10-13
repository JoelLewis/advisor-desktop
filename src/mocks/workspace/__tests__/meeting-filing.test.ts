import { describe, it, expect } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { isTradingDay } from '@/lib/trading-calendar'
import { holdMeeting, meetingView, notesFingerprint, saveNotes } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { archiveFor } from '../archive'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const MARK = 'cco-001'
const meeting = () => store().meetings[0]!
function readyToFile(): string {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  return meetingView(ADRIAN, 'evt-010')!.notesFingerprint!
}
const fileActs = () => store().acts.filter((a) => a.kind === 'file_meeting_record')

describe('filing the meeting record', () => {
  it('records the act against the notes as read, keeps the lines as filed, and closes the meeting', () => {
    const fingerprint = readyToFile()
    const draft = meeting().notesDraft!
    const { act } = ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
    expect(act).toMatchObject({
      id: 'REC-0001', kind: 'file_meeting_record', actorId: ADRIAN, threadId: 'th-johnson-meeting',
      subject: { type: 'meeting', id: 'evt-010' }, fingerprint, summary: 'Filed the record of the Johnson annual review',
    })
    expect(meeting()).toMatchObject({ state: 'filed', filed: { actId: 'REC-0001', fingerprint, lines: draft } })
    expect(notesFingerprint(meeting().filed!.lines)).toBe(act.fingerprint)
    expect(meetingView(ADRIAN, 'evt-010')).toMatchObject({ state: 'filed', filedActId: 'REC-0001' })
  })

  it('creates one tracked task per follow-up, owner and due date from its line, all on trading days', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    expect(meeting().tasks.map((t) => [t.id, t.fromNoteLine, t.owner, t.due, t.state])).toEqual([
      ['task-0001', 'n-17', { kind: 'person', personId: 'user-003' }, '2026-03-02', 'open'],
      ['task-0002', 'n-18', { kind: 'person', personId: 'user-001' }, '2026-03-02', 'open'],
      ['task-0003', 'n-19', { kind: 'person', personId: 'user-003' }, '2026-03-06', 'open'],
      ['task-0004', 'n-20', { kind: 'person', personId: 'user-001' }, '2026-02-27', 'open'],
      ['task-0005', 'n-21', { kind: 'person', personId: 'user-002' }, '2026-03-04', 'open'],
      ['task-0006', 'n-22', { kind: 'person', personId: 'user-002' }, '2026-02-26', 'open'],
      ['task-0007', 'n-23', { kind: 'person', personId: 'user-001' }, '2026-03-13', 'open'],
    ])
    for (const t of meeting().tasks) expect(isTradingDay(t.due), t.id).toBe(true)
    expect(meeting().tasks[0]!.title).toBe('Plan scenarios for the legacy goal.')
  })

  it("posts the act's slip, then the task list, in the meeting thread", () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    const thread = store().messages.filter((m) => m.threadId === 'th-johnson-meeting')
    const marker = thread.findIndex((m) => m.kind === 'act' && m.actId === 'REC-0001')
    const tasks = thread.findIndex((m) => m.kind === 'meeting_tasks')
    expect(marker).toBeGreaterThan(-1)
    expect(tasks).toBe(marker + 1)
    expect(thread[tasks]).toMatchObject({ filedActId: 'REC-0001', tasks: meeting().tasks })
  })

  it('files once: a second filing names the first and records nothing', () => {
    const fingerprint = readyToFile()
    ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
    expect(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint)).toEqual({ ok: false, status: 409, code: 'ALREADY_FILED', message: 'The record was already filed (REC-0001).' })
    expect(fileActs()).toHaveLength(1)
    expect(store().messages.filter((m) => m.kind === 'meeting_tasks')).toHaveLength(1)
    expect(meeting().tasks).toHaveLength(7)
  })

  it('refuses notes that moved after they were read, and files nothing', () => {
    const read = readyToFile()
    ok(saveNotes(ADRIAN, 'evt-010', meeting().notesDraft!.map((l) => (l.id === 'n-01' ? { ...l, text: 'Reviewed the rebalance.' } : l))))
    expect(fileMeetingRecord(ADRIAN, 'evt-010', read)).toMatchObject({ status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(fileActs()).toEqual([])
    expect(meeting().state).toBe('held')
  })

  it('needs a held meeting with notes', () => {
    expect(fileMeetingRecord(ADRIAN, 'evt-010', 'X')).toMatchObject({ status: 409, code: 'NOT_HELD' })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(fileMeetingRecord(ADRIAN, 'evt-010', 'X')).toMatchObject({ status: 409, code: 'NO_NOTES' })
  })

  it('only the advisor files; a client is told the meeting does not exist', () => {
    const fingerprint = readyToFile()
    for (const viewer of ['user-002', 'user-003', MARK]) expect(fileMeetingRecord(viewer, 'evt-010', fingerprint), viewer).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    expect(fileMeetingRecord('cli-001', 'evt-010', fingerprint)).toMatchObject({ status: 404, code: 'NO_MEETING' })
    expect(fileActs()).toEqual([])
  })

  it('a filed record cannot be edited, re-drafted or held again', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    expect(saveNotes(ADRIAN, 'evt-010', meeting().filed!.lines)).toMatchObject({ status: 409, code: 'ALREADY_FILED' })
    expect(draftMeetingNotes(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'ALREADY_FILED' })
    expect(holdMeeting(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'ALREADY_HELD' })
  })

  it('after filing, saving and re-drafting are refused, the meeting stays filed, and the filed lines are unchanged', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    const filedLines = structuredClone(meeting().filed!.lines)
    const edited = filedLines.map((l) => (l.id === 'n-01' ? { ...l, text: 'Reviewed the rebalance.' } : l))
    expect(saveNotes(ADRIAN, 'evt-010', edited)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_FILED' })
    expect(draftMeetingNotes(ADRIAN, 'evt-010')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_FILED' })
    expect(meeting().state).toBe('filed')
    expect(meeting().filed!.lines).toEqual(filedLines)
    expect(notesFingerprint(meeting().filed!.lines)).toBe(meeting().filed!.fingerprint)
  })

  it('appears in the Archive, with the Johnsons as its client, for the firm and not for Robert', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    for (const viewer of [ADRIAN, MARK, 'user-002']) {
      const entry = archiveFor(viewer, { kind: 'file_meeting_record' })?.entries[0]
      expect(entry, viewer).toMatchObject({ kind: 'act', id: 'REC-0001', clientId: 'cli-001', clientName: 'Robert Johnson', threadId: 'th-johnson-meeting', threadTitle: 'Johnson annual review' })
    }
    expect(archiveFor('cli-001', {})).toBeUndefined()
  })

  it('reset restores the seeded meeting', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    resetWorkspaceStore()
    expect(store().meetings).toEqual([{ eventId: 'evt-010', householdId: 'hh-001', threadId: 'th-johnson-meeting', state: 'scheduled', agenda: [], tasks: [] }])
    expect(store().acts).toEqual([])
  })
})
