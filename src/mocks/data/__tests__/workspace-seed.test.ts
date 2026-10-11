import { describe, it, expect } from 'vitest'
import { store, resetWorkspaceStore, nextActId } from '../workspace-store'

describe('workspace seed', () => {
  it('has one thread per visibility with the right owners and members', () => {
    resetWorkspaceStore()
    const { threads } = store()
    const byVis = Object.fromEntries(threads.map((t) => [t.visibility, t]))
    expect(byVis.private!).toMatchObject({ ownerId: 'user-001', memberIds: ['user-001'] })
    expect(byVis.internal!).toMatchObject({ title: 'Johnson Rebalance Review', subject: { type: 'account', id: 'acc-002' } })
    expect(byVis.internal!.agentIds).toEqual(['drift-monitor', 'pretrade-check'])
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
    expect(nextActId()).toBe('REC-0001')
    store().acts.push({ id: 'REC-0001', kind: 'send_to_client', actorId: 'user-001', at: 'x', threadId: 't', fingerprint: 'x', summary: 'x' })
    resetWorkspaceStore()
    expect(store().acts).toEqual([])
    expect(nextActId()).toBe('REC-0001')
  })
})
