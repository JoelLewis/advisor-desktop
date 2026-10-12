import { describe, it, expect } from 'vitest'
import { store, resetWorkspaceStore, commitActId, nextAt } from '../workspace-store'
import { SEED_LAST_SEQUENCE, SEED_MESSAGES } from '../workspace-seed'
import { MOCK_NOW_ISO, eventTime } from '@/lib/clock'
import { accounts } from '../accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'

describe('workspace seed', () => {
  it('has one thread per visibility with the right owners and members', () => {
    resetWorkspaceStore()
    const { threads } = store()
    const byVis = Object.fromEntries(threads.map((t) => [t.visibility, t]))
    expect(byVis.private!).toMatchObject({ ownerId: 'user-001', memberIds: ['user-001'] })
    expect(byVis.internal!).toMatchObject({ title: 'Johnson Rebalance Review', subject: { type: 'account', id: 'acc-002' } })
    expect(byVis.internal!.agentIds).toEqual(['drift-monitor', 'pretrade-check', 'proposal'])
    expect(byVis.client!).toMatchObject({ clientId: 'cli-001', agentIds: [] })
    expect(byVis.client!.memberIds).toEqual(expect.arrayContaining(['cli-001', 'user-001', 'user-002']))
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
    store().acts.push({ id: 'REC-0001', kind: 'send_to_client', actorId: 'user-001', at: 'x', threadId: 't', fingerprint: 'x', summary: 'x' })
    resetWorkspaceStore()
    expect(store().acts).toEqual([])
    expect(commitActId()).toBe('REC-0001')
  })
  it('seed messages take the first event-clock sequences, in order, after the calculation as-of', () => {
    expect(SEED_MESSAGES.map((m) => m.at)).toEqual(SEED_MESSAGES.map((_, i) => eventTime(i + 1)))
    expect(SEED_LAST_SEQUENCE).toBe(SEED_MESSAGES.length)
    const embeddedDriftAsOf = computeDriftForAccount(accounts.find((a) => a.id === 'acc-002')!).lastCalculated
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
