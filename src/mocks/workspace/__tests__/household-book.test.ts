import { describe, it, expect } from 'vitest'
import { advanceClockTo, nextAt, sessionNow, store } from '@/mocks/data/workspace-store'
import { minuteOf } from '@/lib/clock'
import { householdBook, unapprovedProposals } from '../household-book'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { sendToParty } from '../acts'
import { createProposal } from '../proposals'
import { startConversation } from '../conversations'
import { approvedStoryV3, approvedV1, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const book = () => {
  const b = householdBook(ADRIAN)
  if (!b) throw new Error('Adrian reads his book')
  return b
}
const rowOf = (id: string) => {
  const row = book().households.find((h) => h.householdId === id)
  if (!row) throw new Error(`no row for ${id}`)
  return row
}
const kinds = (id: string) => rowOf(id).reasons.map((r) => r.kind)

describe('reading the book', () => {
  it('never writes: after fills move the book, reading it twice leaves the messages and the event clock as they were', () => {
    release(approvedV1())
    const [messages, clock, briefBook] = [store().messages.length, sessionNow(), store().briefMeasured]
    book()
    book()
    expect(store().messages).toHaveLength(messages)
    expect(sessionNow()).toBe(clock)
    expect(store().briefMeasured).toEqual(briefBook)
  })
})

describe('the household queue', () => {
  it('ranks who needs the advisor today: a decision, then meetings in time order, then compliance oldest first', () => {
    expect(book().queue.map((h) => h.householdId)).toEqual(['hh-001', 'hh-006', 'hh-007', 'hh-005', 'hh-011'])
  })

  it("names the Johnsons' reasons in tier order: a decision, Robert waiting, the review, an open alert", () => {
    expect(rowOf('hh-001').reasons).toEqual([
      { kind: 'decision', count: 1, since: '2026-02-25T12:00:00Z' },
      { kind: 'client_waiting', clientName: 'Robert Johnson', since: '2026-02-25T12:01:00.000Z', threadId: 'th-robert' },
      { kind: 'meeting', label: 'review', start: '2026-02-25T19:00:00.000Z', eventId: 'evt-010' },
      { kind: 'compliance', count: 1, since: '2026-02-23T13:00:00Z' },
    ])
  })

  it('a household with nothing due is in the A–Z list and not in the queue, with no reasons', () => {
    expect(book().queue.some((h) => h.householdId === 'hh-008')).toBe(false)
    expect(rowOf('hh-008').reasons).toEqual([])
    expect(book().households.map((h) => h.name)).toEqual([...book().households.map((h) => h.name)].sort((a, b) => a.localeCompare(b)))
  })

  it("values each household in USD and marks out-of-band drift, open compliance items and open items", () => {
    // The five Johnson accounts as accounts.ts states them: 8,200,000 + 4,500,000 + 3,550,000 + 450,000 + 2,050,000.
    expect(rowOf('hh-001').managedValue).toBe(18_750_000)
    expect(rowOf('hh-001').markers).toEqual({ outOfBand: true, compliance: 1, tasks: 1 })
  })

  it("after the release, the Johnsons' decision drops off and the meeting remains", () => {
    release(approvedStoryV3())
    expect(kinds('hh-001')).toEqual(['client_waiting', 'meeting', 'compliance'])
  })

  it("after a jump to Thursday, Wednesday's meetings are not today's", () => {
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    expect(book().households.flatMap((h) => h.reasons).filter((r) => r.kind === 'meeting' && r.start.startsWith('2026-02-25'))).toEqual([])
  })

  it("Patricia waiting after she writes; answered by the recap's delivery to her thread", async () => {
    const res = await fetch('/api/workspace/threads/th-patricia/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Viewer': 'cli-002' }, body: JSON.stringify({ body: 'Will the review cover my accounts too?' }),
    })
    expect(res.status).toBe(201)
    expect(rowOf('hh-001').reasons.filter((r) => r.kind === 'client_waiting').map((r) => r.kind === 'client_waiting' && r.clientName)).toEqual(['Robert Johnson', 'Patricia Johnson'])
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    const fingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
    if (!fingerprint) throw new Error('the notes have a fingerprint')
    ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
    ok(sendToParty(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
    const waiting = rowOf('hh-001').reasons.flatMap((r) => (r.kind === 'client_waiting' ? [r.clientName] : []))
    expect(waiting).not.toContain('Patricia Johnson')
    expect(waiting).toEqual([])
  })

  it('orders meetings by when they fall, never by name: each meeting-tier row starts no earlier than the one before', () => {
    const starts = book().queue.flatMap((h) => (h.reasons[0]?.kind === 'meeting' ? [Date.parse(h.reasons[0].start)] : []))
    expect(starts.length).toBeGreaterThan(1)
    expect(new Set(starts).size, 'no two meetings share a start, so the name never breaks a tie here').toBe(starts.length)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('ranks clients waiting across households by how long they have waited, above every meeting', () => {
    release(approvedStoryV3())
    const margaret = ok(startConversation(ADRIAN, { householdId: 'hh-002', title: '', audience: { kind: 'client', clientId: 'cli-003' } })).thread
    // Margaret is not a View-as target, so her message is seeded as a client's would be.
    store().messages.push({ kind: 'text', id: 'msg-margaret', threadId: margaret.id, authorId: 'cli-003', at: nextAt(), body: 'Can we talk about the Hong Kong account?' })
    const queue = book().queue.map((h) => [h.householdId, h.reasons[0]?.kind])
    // Robert has waited since 07:01 ET; Margaret wrote just now. Chen-Wong sorts before Johnson by name, so the order is age.
    expect(queue.slice(0, 2)).toEqual([['hh-001', 'client_waiting'], ['hh-002', 'client_waiting']])
    expect(queue[2]?.[1]).toBe('meeting')
  })

  it('ranks tasks across households by the oldest due date, never by name', () => {
    const task = (id: string, due: string) => ({ id, title: 'Follow up', owner: { kind: 'person' as const, personId: ADRIAN }, due, state: 'open' as const, fromNoteLine: 'n-01' })
    store().meetings.push(
      { eventId: 'evt-x1', householdId: 'hh-008', threadId: 'th-brief', state: 'filed', agenda: [], tasks: [task('t-x1', '2026-02-25')] },
      { eventId: 'evt-x2', householdId: 'hh-012', threadId: 'th-brief', state: 'filed', agenda: [], tasks: [task('t-x2', '2026-02-23')] },
    )
    const tasks = book().queue.filter((h) => h.reasons[0]?.kind === 'task').map((h) => h.householdId)
    // O'Brien sorts before Taylor by name; Taylor's task is two days older, so it leads.
    expect(tasks).toEqual(['hh-012', 'hh-008'])
  })

  it('is firm only', () => {
    expect(householdBook('cli-001')).toBeUndefined()
    expect(householdBook('cli-002')).toBeUndefined()
    expect(householdBook('prsp-011')).toBeUndefined()
  })
})

describe('unapprovedProposals', () => {
  const johnsonAccount = new Set(['acc-002'])

  it('counts a draft proposal on the given accounts, and only on them', () => {
    const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
    expect(unapprovedProposals(johnsonAccount).map((p) => p.id)).toEqual([detail.id])
    expect(unapprovedProposals(new Set(['acc-001']))).toEqual([])
  })

  it('drops a proposal once it is approved', () => {
    approvedV1()
    expect(unapprovedProposals(johnsonAccount)).toEqual([])
  })
})
