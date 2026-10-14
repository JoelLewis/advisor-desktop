import { describe, it, expect, beforeEach } from 'vitest'
import type { Message } from '@/types/workspace'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { BRIEF_THREAD_ID, briefMessages } from '../brief'
import { runAgent } from '../run-agent'
import { runKeyOf } from '../run-key'

type Finding = Extract<Message, { kind: 'agent_finding' }>
const findings = () => briefMessages().filter((m): m is Finding => m.kind === 'agent_finding')

describe('the Brief, ready on load', () => {
  beforeEach(() => resetWorkspaceStore())

  it('opens with a ranked summary: findings that need attention first, Drift Monitor before Harvest Scanner', () => {
    const [summary] = briefMessages()
    if (summary?.kind !== 'brief_summary') throw new Error('The Brief must open with its summary')
    const byId = new Map(findings().map((f) => [f.id, f]))
    const ranked = summary.items.map((i) => byId.get(i.findingId)!)
    expect(ranked.length).toBe(findings().length)
    const attention = ranked.map((f) => f.attention)
    expect(attention).toEqual([...attention].sort((a, b) => Number(b === 'attention') - Number(a === 'attention')))
    expect(ranked[0]).toMatchObject({ agentId: 'drift-monitor', claim: 'US Equity is outside its tolerance band.' })
    expect(ranked[1]).toMatchObject({ agentId: 'harvest-scanner', claim: 'Intel Corp. can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.' })
    for (const item of summary.items) expect(item.claim).not.toMatch(/\d/)
  })

  it('is computed at the frozen morning with the run keys a run would use', () => {
    for (const m of briefMessages()) {
      expect(m.threadId).toBe(BRIEF_THREAD_ID)
      expect(m.at).toBe(MOCK_NOW_ISO)
    }
    for (const f of findings()) expect(f.runKey).toBe(runKeyOf(f.agentId, BRIEF_THREAD_ID, { type: 'account', id: 'acc-002' }))
  })

  it('is in the store on load, and asking its agents again adds nothing', () => {
    const before = store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID && m.kind !== 'meeting_notice' && m.kind !== 'next_action' && m.kind !== 'reconciliation_notice').map((m) => m.id)
    expect(before).toEqual(briefMessages().map((m) => m.id))
    for (const agent of ['drift-monitor', 'harvest-scanner'] as const) {
      const r = runAgent('user-001', BRIEF_THREAD_ID, agent)
      if (!r.ok) throw new Error(r.message)
      expect(r.findings.every((f) => before.includes(f.id))).toBe(true)
    }
    expect(store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID && m.kind !== 'meeting_notice' && m.kind !== 'next_action' && m.kind !== 'reconciliation_notice')).toHaveLength(before.length)
  })
})
