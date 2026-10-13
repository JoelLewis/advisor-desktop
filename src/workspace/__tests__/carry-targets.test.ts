import { describe, it, expect } from 'vitest'
import { carryTargets } from '@/workspace/thread/carry-targets'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'

describe('where the Brief can carry a finding', () => {
  it("to the team thread about the same account, and to the meeting thread of the account's household", () => {
    expect(carryTargets(SEED_THREADS, 'user-001', { type: 'account', id: 'acc-002' }, 'hh-001').map((t) => [t.thread.id, t.label])).toEqual([
      ['th-johnson-review', 'Take to team thread'],
      ['th-johnson-meeting', 'Take to Johnson annual review'],
    ])
  })
  it('nowhere without a subject, and to no thread the viewer is not a member of', () => {
    expect(carryTargets(SEED_THREADS, 'user-001', undefined, 'hh-001')).toEqual([])
    expect(carryTargets(SEED_THREADS, 'cco-001', { type: 'account', id: 'acc-002' }, 'hh-001')).toEqual([])
  })
})
