import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { briefMessages } from '../brief'
import { settleApproved, type BriefSummary } from '../brief-groups'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { suitablyApprovedAccounts } from '../suitability'
import { JOHNSON_REASON } from '@/test/suitability-fixture'
import { seedJohnsonProposal } from './proposal-fixture'

const summaryNow = (): BriefSummary => {
  const s = briefMessages().find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('no summary')
  return settleApproved(s, suitablyApprovedAccounts())
}
const decides = (s: BriefSummary) => s.decide.some((i) => i.awaitsApprovalOf === 'acc-002')

describe("the Brief's suitability line", () => {
  beforeEach(() => resetWorkspaceStore())

  it('needs a decision until the proposal is approved with a reason, then sits at the head of Context', () => {
    expect(decides(summaryNow())).toBe(true)
    const p = seedJohnsonProposal()
    const r = approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    if (!r.ok) throw new Error(r.message)
    expect(decides(summaryNow())).toBe(false)
    expect(summaryNow().context[0]?.awaitsApprovalOf).toBe('acc-002')
  })
  it('the line returns to Needs a decision when the approval is withdrawn', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint, JOHNSON_REASON)
    expect(withdrawApproval('user-001', p.id).ok).toBe(true)
    expect(decides(summaryNow())).toBe(true)
  })
})
