import { describe, it, expect, beforeEach } from 'vitest'
import type { Thread } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { agentConstraints, draftSummary, revisionSummary } from '@/mocks/agents/proposal-agent'
import { buildVersion } from '../proposal-engine'
import { createProposal, previewEdits, readableProposals, reviseProposal, saveVersion } from '../proposals'
import { runAgent } from '../run-agent'

const create = () => {
  const r = createProposal('user-001', 'th-johnson-review', 'acc-002')
  if (!r.ok) throw new Error(r.message)
  return r.detail
}

/** Puts the Proposal Agent on a thread, with an account subject, so only the thread's visibility can refuse the draft. */
const withProposalAgent = (threadId: string) => {
  const s = store()
  s.threads = s.threads.map((t): Thread => (t.id === threadId
    ? { ...t, agentIds: [...t.agentIds, 'proposal'], subject: { type: 'account', id: 'acc-002' } }
    : t))
}

describe('asking the Proposal Agent', () => {
  beforeEach(() => resetWorkspaceStore())

  it('drafts v1 in the team thread as an embed; asking again returns the same proposal', () => {
    const detail = create()
    expect(detail).toMatchObject({ id: 'prop-0001', title: 'Johnson rebalance', accountId: 'acc-002', clientId: 'cli-001', threadId: 'th-johnson-review' })
    const v1 = detail.versions[0]!
    expect(v1).toMatchObject({ n: 1, author: { kind: 'agent', agentId: 'proposal' }, constraints: [{ kind: 'avoid_self_wash' }], edits: [] })
    expect(v1.changeSummary).toBe("Drafted a tax-aware rebalance toward the Growth model. It sells losses first, then the lots that cost the least tax, and buys nothing that would wash one of the taxpayer's losses.")
    expect(detail.approval).toEqual({ kind: 'unapproved', latestVersion: 1 })
    const posted = store().messages.filter((m) => m.kind === 'proposal')
    expect(posted).toEqual([expect.objectContaining({ threadId: 'th-johnson-review', agentId: 'proposal', proposalId: 'prop-0001', at: v1.createdAt })])
    const again = createProposal('user-001', 'th-johnson-review', 'acc-002')
    expect(again).toMatchObject({ ok: true, created: false, detail: { id: 'prop-0001' } })
    expect(store().messages.filter((m) => m.kind === 'proposal')).toHaveLength(1)
  })

  it.each([
    ['cli-001', 'th-johnson-review', 'acc-002', 404],
    ['cco-001', 'th-johnson-review', 'acc-002', 403],
    ['user-001', 'th-brief', 'acc-002', 400],
    ['user-001', 'th-robert', 'acc-002', 400],
    ['user-001', 'th-johnson-review', 'acc-001', 400],
    ['user-001', 'th-nowhere', 'acc-002', 404],
  ] as const)('%s asking on %s for %s → %s', (viewer, thread, account, status) => {
    expect(createProposal(viewer, thread, account)).toMatchObject({ ok: false, status })
    expect(store().proposals).toEqual([])
  })

  it('drafts only in a firm team thread: never in a private thread, even with the agent on it', () => {
    withProposalAgent('th-brief')
    const messages = store().messages.length
    expect(createProposal('user-001', 'th-brief', 'acc-002')).toMatchObject({ ok: false, status: 400, code: 'NOT_A_TEAM_THREAD' })
    expect(store().proposals).toEqual([])
    expect(store().messages).toHaveLength(messages)
  })

  it('never drafts in a client thread, even with the agent on it', () => {
    withProposalAgent('th-robert')
    const messages = store().messages.length
    expect(createProposal('user-001', 'th-robert', 'acc-002')).toMatchObject({ ok: false, status: 400, code: 'CLIENT_THREAD' })
    expect(createProposal('cli-001', 'th-robert', 'acc-002')).toMatchObject({ ok: false, status: 404 })
    expect(store().proposals).toEqual([])
    expect(store().messages).toHaveLength(messages)
  })

  it('a drafting agent is not run like a finding agent', () => {
    expect(runAgent('user-001', 'th-johnson-review', 'proposal')).toMatchObject({ ok: false, status: 400, code: 'NO_FINDINGS' })
  })
})

describe('revising under constraints', () => {
  beforeEach(() => resetWorkspaceStore())

  it('posts v2 as a version line with a digit-free change summary', () => {
    const { id } = create()
    const r = reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    if (!r.ok) throw new Error(r.message)
    const v2 = r.detail.versions[1]!
    expect(v2).toMatchObject({ n: 2, author: { kind: 'agent', agentId: 'proposal' }, constraints: [{ kind: 'avoid_self_wash' }, { kind: 'harvest_only' }], edits: [] })
    expect(v2.changeSummary).toMatch(/^Revised to sell only lots at a loss\. /)
    expect(v2.changeSummary).toContain('US Equity')
    expect(v2.changeSummary).not.toMatch(/\d/)
    const line = store().messages[store().messages.length - 1]!
    expect(line).toMatchObject({ kind: 'proposal_version', proposalId: id, version: 2, author: { kind: 'agent', agentId: 'proposal' }, changeSummary: v2.changeSummary })
  })

  it('says when workbench edits on the previous version are not carried', () => {
    const { id } = create()
    saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'QAI' }])
    const r = reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    if (!r.ok) throw new Error(r.message)
    const v3 = r.detail.versions[2]!
    expect(v3.edits).toEqual([])
    expect(v3.changeSummary).toMatch(/ Workbench edits on the previous version are not carried into this one\.$/)
  })

  it('refuses a revision that changes nothing, and bad requests', () => {
    const { id } = create()
    expect(reviseProposal('user-001', id, [])).toMatchObject({ ok: false, status: 409, code: 'NO_CHANGE' })
    expect(reviseProposal('cli-001', id, [{ kind: 'harvest_only' }])).toMatchObject({ ok: false, status: 404 })
    expect(reviseProposal('user-001', 'prop-9999', [{ kind: 'harvest_only' }])).toMatchObject({ ok: false, status: 404 })
  })
})

describe('workbench versions', () => {
  beforeEach(() => resetWorkspaceStore())

  it('saves the edits on top of the latest constraints as a person version, and says what changed', () => {
    const { id } = create()
    reviseProposal('user-001', id, [{ kind: 'cap_realised_gains', usd: 50_000 }])
    const r = saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'QAI' }])
    if (!r.ok) throw new Error(r.message)
    const v3 = r.detail.versions[2]!
    expect(v3).toMatchObject({ n: 3, author: { kind: 'person', personId: 'user-001' }, constraints: [{ kind: 'avoid_self_wash' }, { kind: 'cap_realised_gains', usd: 50_000 }], edits: [{ kind: 'exclude', symbol: 'QAI' }] })
    expect(v3.changeSummary).toBe('Workbench edits: excluded IQ Hedge Multi-Strategy Tracker ETF.')
    expect(store().messages[store().messages.length - 1]).toMatchObject({ kind: 'proposal_version', version: 3, author: { kind: 'person', personId: 'user-001' } })
  })

  it('each saved version equals a fresh engine run on its constraints and edits', () => {
    const { id } = create()
    reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    const r = saveVersion('user-001', id, [{ kind: 'quantity', symbol: 'INTC', quantity: 6_000 }])
    if (!r.ok) throw new Error(r.message)
    for (const v of r.detail.versions) {
      const fresh = buildVersion('acc-002', v.constraints, v.edits)
      if (!fresh.ok) throw new Error(fresh.message)
      expect({ preview: v.preview, pretrade: v.pretrade, legFacts: v.legFacts, excludedLegs: v.excludedLegs, summary: v.summary, fingerprint: v.fingerprint }).toEqual(fresh.built)
    }
  })

  it('refuses invalid edits, an unchanged version, and non-members; a preview changes nothing', () => {
    const { id } = create()
    expect(saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'MSFT' }])).toMatchObject({ ok: false, status: 400, code: 'NOT_A_LEG' })
    expect(saveVersion('user-001', id, [{ kind: 'quantity', symbol: 'INTC', quantity: 0 }])).toMatchObject({ ok: false, status: 400, code: 'BAD_QUANTITY' })
    expect(saveVersion('user-001', id, [])).toMatchObject({ ok: false, status: 409, code: 'NO_CHANGE' })
    expect(saveVersion('cco-001', id, [{ kind: 'exclude', symbol: 'QAI' }])).toMatchObject({ ok: false, status: 403 })
    const messages = store().messages.length
    const preview = previewEdits('cco-001', id, [{ kind: 'exclude', symbol: 'QAI' }])
    expect(preview.ok).toBe(true)
    expect(previewEdits('cli-001', id, [])).toMatchObject({ ok: false, status: 404 })
    expect(store().messages).toHaveLength(messages)
    expect(store().proposals[0]!.versions).toHaveLength(1)
  })

  it('lists proposals for firm viewers who can see the thread, and nothing for a client', () => {
    const { id } = create()
    expect(readableProposals('cco-001', 'th-johnson-review')?.map((p) => p.id)).toEqual([id])
    expect(readableProposals('user-001')?.map((p) => p.id)).toEqual([id])
    expect(readableProposals('cli-001')).toBeUndefined()
    expect(readableProposals('cli-001', 'th-johnson-review')).toBeUndefined()
    expect(readableProposals('user-001', 'th-robert')).toBeUndefined()
  })
})

describe('the Proposal Agent over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: digit-free summaries, and no buy that washes one of the taxpayer\'s losses', (id) => {
    expect(draftSummary(id)).not.toMatch(/\d/)
    for (const requested of [[], [{ kind: 'harvest_only' as const }]]) {
      const built = buildVersion(id, agentConstraints(requested), [])
      if (!built.ok) throw new Error(built.message)
      for (const leg of built.built.preview.trades.filter((t) => t.side === 'buy')) expect(leg.washSaleRisk).toBe(false)
      expect(revisionSummary(agentConstraints(requested), built.built, false)).not.toMatch(/\d/)
      expect(revisionSummary(agentConstraints(requested), built.built, true)).not.toMatch(/\d/)
    }
  })
})
