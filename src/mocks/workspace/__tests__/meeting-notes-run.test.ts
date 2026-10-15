import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { holdMeeting, meetingView, saveNotes } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { ok } from './story-fixture'
import type { NoteLine } from '@/types/workspace-meeting'

const ADRIAN = 'user-001'
const draft = () => store().meetings[0]!.notesDraft!
const held = () => ok(holdMeeting(ADRIAN, 'evt-010'))
const drafted = () => { held(); ok(draftMeetingNotes(ADRIAN, 'evt-010')) }
const edited = (lines: NoteLine[], id: string, text: string) => lines.map((l) => (l.id === id ? { ...l, text } : l))

describe('drafting the notes', () => {
  it('waits for the meeting to be held: no notes, and no transcript, before then', () => {
    expect(draftMeetingNotes(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'NOT_HELD' })
    expect(meetingView(ADRIAN, 'evt-010')?.transcript).toBeUndefined()
  })

  it('drafts once the meeting is held, and posts the notes line in the meeting thread', () => {
    held()
    const r = ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    expect(r.created).toBe(true)
    expect(draft()).toHaveLength(23)
    const line = store().messages.find((m) => m.kind === 'notes_drafted')
    expect(line).toMatchObject({ threadId: 'th-johnson-meeting', eventId: 'evt-010', agentId: 'meeting-notes' })
    const view = meetingView(ADRIAN, 'evt-010')!
    expect(view.notesDraft).toEqual(draft())
    expect(view.notesFingerprint).toMatch(/^[0-9A-F]{8}$/)
  })

  it("a second request keeps Adrian's edits and posts nothing new", () => {
    drafted()
    ok(saveNotes(ADRIAN, 'evt-010', edited(draft(), 'n-01', 'Reviewed the rebalance and the Intel harvest.')))
    expect(ok(draftMeetingNotes(ADRIAN, 'evt-010')).created).toBe(false)
    expect(draft()[0]!.text).toBe('Reviewed the rebalance and the Intel harvest.')
    expect(store().messages.filter((m) => m.kind === 'notes_drafted')).toHaveLength(1)
  })

  it('only the advisor drafts; a client is told the meeting does not exist', () => {
    held()
    expect(draftMeetingNotes('user-002', 'evt-010')).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    expect(draftMeetingNotes('cli-001', 'evt-010')).toMatchObject({ status: 404, code: 'NO_MEETING' })
  })
})

describe("Adrian's edits", () => {
  it('saves edited text, a removed line and a new cited line; the fingerprint follows', () => {
    drafted()
    const before = meetingView(ADRIAN, 'evt-010')!.notesFingerprint
    const lines = edited(draft(), 'n-01', '  Reviewed the rebalance and the Intel harvest.  ').filter((l) => l.id !== 'n-07')
    ok(saveNotes(ADRIAN, 'evt-010', [...lines, { section: 'discussion', text: 'Patricia agreed with the plan.', cites: ['t-28', 't-28'] }]))
    expect(draft()).toHaveLength(23)
    expect(draft()[0]!.text).toBe('Reviewed the rebalance and the Intel harvest.')
    expect(draft().map((l) => l.id)).not.toContain('n-07')
    expect(draft()[22]).toEqual({ id: 'n-0001', section: 'discussion', text: 'Patricia agreed with the plan.', cites: ['t-28'] })
    expect(meetingView(ADRIAN, 'evt-010')!.notesFingerprint).not.toBe(before)
  })

  it.each([
    ['NO_LINES', () => []],
    ['NOTE_TEXT_REQUIRED', () => edited(draft(), 'n-01', ' \n ')],
    ['NOTE_TEXT_TOO_LONG', () => edited(draft(), 'n-01', 'x'.repeat(2001))],
    ['CITATION_REQUIRED', () => draft().map((l) => (l.id === 'n-01' ? { ...l, cites: [] } : l))],
    ['UNKNOWN_CITATION', () => draft().map((l) => (l.id === 'n-01' ? { ...l, cites: ['t-99'] } : l))],
    ['UNKNOWN_LINE', () => draft().map((l) => (l.id === 'n-01' ? { ...l, id: 'n-77' } : l))],
    ['DUPLICATE_LINE', () => [...draft(), draft()[0]!]],
    ['FOLLOW_UP_INCOMPLETE', () => draft().map((l) => (l.id === 'n-17' ? { id: l.id, section: l.section, text: l.text, cites: l.cites } : l))],
    ['UNKNOWN_OWNER', () => draft().map((l) => (l.id === 'n-17' ? { ...l, owner: { kind: 'person' as const, personId: 'cli-001' } } : l))],
    ['OWNER_ONLY_ON_FOLLOW_UP', () => draft().map((l) => (l.id === 'n-01' ? { ...l, owner: { kind: 'person' as const, personId: 'user-001' } } : l))],
    ['OWNER_ONLY_ON_FOLLOW_UP', () => draft().map((l) => (l.id === 'n-01' ? { ...l, due: '2026-02-26' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-17' ? { ...l, due: '2026-02-28' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-17' ? { ...l, due: '2026-02-24' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-17' ? { ...l, due: '2026-02-31' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-17' ? { ...l, due: '2027-01-04' } : l))],
  ] as const)('refuses %s and leaves the draft as it was', (code, lines) => {
    drafted()
    const before = JSON.parse(JSON.stringify(draft())) as NoteLine[]
    expect(saveNotes(ADRIAN, 'evt-010', lines())).toMatchObject({ ok: false, status: 400, code })
    expect(draft()).toEqual(before)
  })

  it('needs a held meeting and a draft; only the advisor edits', () => {
    expect(saveNotes(ADRIAN, 'evt-010', [])).toMatchObject({ status: 409, code: 'NOT_HELD' })
    held()
    expect(saveNotes(ADRIAN, 'evt-010', [])).toMatchObject({ status: 409, code: 'NO_NOTES' })
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    expect(saveNotes('user-003', 'evt-010', draft())).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
  })
})
