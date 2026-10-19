import { describe, it, expect } from 'vitest'
import { carryTargets } from '@/workspace/thread/carry-targets'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'

describe('where the Brief can carry a finding', () => {
  it("to the team thread about the same account, and to the meeting thread of the account's household", () => {
    expect(carryTargets(SEED_THREADS, 'user-001', { type: 'account', id: 'acc-002' }, 'hh-001').map((t) => t.id)).toEqual([
      'th-johnson-review',
      'th-johnson-meeting',
    ])
  })
  it('nowhere without a subject, and to no thread the viewer is not a member of', () => {
    expect(carryTargets(SEED_THREADS, 'user-001', undefined, 'hh-001')).toEqual([])
    expect(carryTargets(SEED_THREADS, 'cco-001', { type: 'account', id: 'acc-002' }, 'hh-001')).toEqual([])
  })
  it('to a team thread started from the household page, under its own title', () => {
    const started = { id: 'th-0001', title: 'Johnson tax planning', visibility: 'internal' as const, memberIds: ['user-001', 'user-002'], agentIds: [], subject: { type: 'household' as const, id: 'hh-001' } }
    const targets = carryTargets([...SEED_THREADS, started], 'user-001', { type: 'account', id: 'acc-002' }, 'hh-001')
    expect(targets.map((t) => [t.id, t.title])).toEqual([
      ['th-johnson-review', 'Johnson Rebalance Review'],
      ['th-johnson-meeting', 'Johnson annual review'],
      ['th-0001', 'Johnson tax planning'],
    ])
  })
})
