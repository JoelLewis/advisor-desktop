import { describe, it, expect } from 'vitest'
import { store, resetWorkspaceStore, commitActId, nextAt, sessionNow } from '../workspace-store'
import { MEETING_THREAD_ID, SEED_LAST_SEQUENCE, SEED_MEETINGS, SEED_MESSAGES } from '../workspace-seed'
import { MOCK_NOW_ISO, eventTime } from '@/lib/clock'
import { accounts } from '../accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { requireModelManaged } from '@/lib/mandate'

describe('workspace seed', () => {
  it('has the brief, two team threads and the client thread, with the right owners and members', () => {
    resetWorkspaceStore()
    const { threads } = store()
    expect(threads.map((t) => [t.id, t.visibility])).toEqual([
      ['th-brief', 'private'], ['th-johnson-review', 'internal'], ['th-johnson-meeting', 'internal'], ['th-robert', 'client'], ['th-patricia', 'client'], ['th-pell', 'client'], ['th-pell-work', 'internal'],
    ])
    const [brief, review, , client] = threads
    expect(brief).toMatchObject({ ownerId: 'user-001', memberIds: ['user-001'] })
    expect(review).toMatchObject({ title: 'Johnson Rebalance Review', subject: { type: 'account', id: 'acc-002' } })
    expect(review!.agentIds).toEqual(['drift-monitor', 'pretrade-check', 'proposal'])
    expect(client).toMatchObject({ partyId: 'cli-001', agentIds: [] })
    expect(client!.memberIds).toEqual(expect.arrayContaining(['cli-001', 'user-001', 'user-002']))
  })
  it('the meeting thread is internal, about the Johnson household, with the two meeting agents', () => {
    resetWorkspaceStore()
    expect(store().threads.find((t) => t.id === MEETING_THREAD_ID)).toEqual({
      id: 'th-johnson-meeting', title: 'Johnson annual review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
      agentIds: ['meeting-prep', 'meeting-notes'], subject: { type: 'household', id: 'hh-001' },
    })
  })
  it('seeds the Johnson annual review as scheduled, with no agenda, notes or tasks', () => {
    resetWorkspaceStore()
    expect(store().meetings).toEqual([{ eventId: 'evt-010', householdId: 'hh-001', threadId: 'th-johnson-meeting', state: 'scheduled', agenda: [], tasks: [] }])
    expect(SEED_MEETINGS).toEqual(store().meetings)
    expect(store().meetings[0]).not.toBe(SEED_MEETINGS[0])
  })
  it('the session clock reads the latest event-clock sequence', () => {
    resetWorkspaceStore()
    expect(sessionNow()).toBe(eventTime(SEED_LAST_SEQUENCE))
    nextAt()
    expect(sessionNow()).toBe(eventTime(SEED_LAST_SEQUENCE + 1))
  })
  it('seed text carries no figures', () => {
    resetWorkspaceStore()
    for (const m of store().messages) if (m.kind === 'text') expect(m.body).not.toMatch(/\d/)
  })
  it('client thread messages are client-authored', () => {
    resetWorkspaceStore()
    const client = store().threads.find((t) => t.visibility === 'client')!
    for (const m of store().messages.filter((x) => x.threadId === client.id)) {
      expect(m.kind === 'text' && m.authorId === 'cli-001').toBe(true)
    }
  })
  it('reset restores the seed and act ids restart', () => {
    resetWorkspaceStore()
    expect(commitActId()).toBe('REC-0001')
    store().acts.push({ id: 'REC-0001', kind: 'send_to_party', actorId: 'user-001', at: 'x', threadId: 't', fingerprint: 'x', summary: 'x' })
    resetWorkspaceStore()
    expect(store().acts).toEqual([])
    expect(commitActId()).toBe('REC-0001')
  })
  it('seed messages take the reserved event-clock sequences, in order, after the calculation as-of', () => {
    expect(SEED_MESSAGES.map((m) => m.at)).toEqual([1, 2, 3, 4, 6, 7].map(eventTime))
    expect(SEED_LAST_SEQUENCE).toBe(8)
    const embeddedDriftAsOf = computeDriftForAccount(requireModelManaged(accounts.find((a) => a.id === 'acc-002')!)).lastCalculated
    for (const m of SEED_MESSAGES) {
      expect(Date.parse(m.at)).toBeGreaterThan(Date.parse(MOCK_NOW_ISO))
      expect(Date.parse(m.at)).toBeGreaterThanOrEqual(Date.parse(embeddedDriftAsOf))
    }
  })
  it("the session's events follow the seed with distinct, ordered times", () => {
    resetWorkspaceStore()
    const lastSeed = SEED_MESSAGES[SEED_MESSAGES.length - 1]!.at
    const first = nextAt()
    const second = nextAt()
    expect(first).toBe(eventTime(SEED_LAST_SEQUENCE + 1))
    expect(Date.parse(first)).toBeGreaterThan(Date.parse(lastSeed))
    expect(Date.parse(second)).toBeGreaterThan(Date.parse(first))
  })
})
