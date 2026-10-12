import { describe, it, expect, beforeEach } from 'vitest'
import type { Thread } from '@/types/workspace'
import type { ProposalConstraint } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { agentConstraints, draftSummary, revisionSummary } from '@/mocks/agents/proposal-agent'
import { harvestOpportunities } from '@/mocks/agents/harvest-scanner'
import { claimNameOf } from '@/mocks/agents/claim-name'
import { sameWashSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { isSubjectToWashSale } from '@/lib/security-master'
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
    expect(v1.changeSummary).toBe("Drafted a tax-aware rebalance toward the Growth model. Where it sells, it sells loss lots first, then the lots that cost the least tax, and it buys nothing that would wash one of the taxpayer's losses. "
      + 'iShares Core US Aggregate Bond ETF is bought here, so its loss cannot be harvested for thirty days without a wash sale.')
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

  it('never claims tax-aware lot choice for an account whose sales are not taxed', () => {
    for (const account of accounts.filter((a) => a.taxTreatment === 'tax_deferred' || a.taxTreatment === 'tax_free')) {
      const built = buildVersion(account.id, agentConstraints([]), [])
      if (!built.ok) throw new Error(built.message)
      const summary = draftSummary(account.id, built.built)
      expect(summary).toMatch(/^Drafted a rebalance toward /)
      expect(summary).not.toMatch(/tax-aware|least tax|harvests/)
      expect(summary).toContain("buys nothing that would wash one of the taxpayer's losses")
    }
  })

  it('refuses to leave cash untouched, or a class the account does not hold', () => {
    const { id } = create()
    const cash = reviseProposal('user-001', id, [{ kind: 'exclude_asset_class', assetClass: 'cash' }])
    expect(cash).toMatchObject({ ok: false, status: 400, code: 'NOT_EXCLUDABLE' })
    expect(cash.ok ? '' : cash.message).toMatch(/^Cash cannot be left untouched/)
    expect(reviseProposal('user-001', id, [{ kind: 'exclude_asset_class', assetClass: 'emerging_markets' }]))
      .toEqual({ ok: false, status: 400, code: 'NOT_EXCLUDABLE', message: 'The account holds no Emerging Markets to leave untouched.' })
    expect(buildVersion('acc-002', agentConstraints([{ kind: 'exclude_asset_class', assetClass: 'cash' }]), [])).toMatchObject({ ok: false, code: 'NOT_EXCLUDABLE' })
    expect(store().proposals[0]!.versions).toHaveLength(1)
    const held = reviseProposal('user-001', id, [{ kind: 'exclude_asset_class', assetClass: 'intl_equity' }])
    if (!held.ok) throw new Error(held.message)
    expect(held.detail.versions[1]!.changeSummary).toMatch(/^Revised to leave International Equity untouched\. /)
  })

  it('says when a gain cap changes no trade, and not when it does', () => {
    const { id } = create()
    const loose = reviseProposal('user-001', id, [{ kind: 'cap_realised_gains', usd: 100_000_000 }])
    if (!loose.ok) throw new Error(loose.message)
    expect(loose.detail.versions[1]!.changeSummary).toBe('Revised to cap the gains it realises. The cap changes no trade. Every asset class ends inside its band. '
      + 'iShares Core US Aggregate Bond ETF is bought here, so its loss cannot be harvested for thirty days without a wash sale.')
    const tight = reviseProposal('user-001', id, [{ kind: 'cap_realised_gains', usd: 1_000 }])
    if (!tight.ok) throw new Error(tight.message)
    expect(tight.detail.versions[2]!.changeSummary).not.toContain('The cap changes no trade.')
  })

  it('refuses the same constraints whatever their key order', () => {
    const { id } = create()
    reviseProposal('user-001', id, [{ kind: 'cap_realised_gains', usd: 50_000 }])
    const reordered = JSON.parse('[{"usd":50000,"kind":"cap_realised_gains"}]') as ProposalConstraint[]
    expect(reviseProposal('user-001', id, reordered)).toMatchObject({ ok: false, status: 409, code: 'NO_CHANGE' })
  })

  it('a revision that keeps the constraints only drops the workbench edits, and says so', () => {
    const { id } = create()
    saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'QAI' }])
    const bare = reviseProposal('user-001', id, [])
    if (!bare.ok) throw new Error(bare.message)
    expect(bare.detail.versions[2]!.changeSummary).toMatch(/^Back to the agent's own legs; it still buys nothing that would wash one of the taxpayer's losses\. .* Workbench edits on the previous version are not carried into this one\.$/)
    reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'INTC' }])
    const harvest = reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    if (!harvest.ok) throw new Error(harvest.message)
    expect(harvest.detail.versions[5]!.changeSummary).toMatch(/^Back to the agent's legs under the rule to sell only lots at a loss; it still buys nothing that would wash one of the taxpayer's losses\. /)
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
    for (const requested of [[], [{ kind: 'harvest_only' as const }], [{ kind: 'cap_realised_gains' as const, usd: 10_000 }]]) {
      const built = buildVersion(id, agentConstraints(requested), [])
      if (!built.ok) throw new Error(built.message)
      for (const leg of built.built.preview.trades.filter((t) => t.side === 'buy')) expect(leg.washSaleRisk).toBe(false)
      if (requested.length === 0) expect(draftSummary(id, built.built)).not.toMatch(/\d/)
      expect(revisionSummary(agentConstraints(requested), built.built)).not.toMatch(/\d/)
      expect(revisionSummary(agentConstraints(requested), built.built, { constraints: agentConstraints([]), edits: [{ kind: 'exclude', symbol: 'X' }] })).not.toMatch(/\d/)
      expect(revisionSummary(agentConstraints(requested), built.built, { constraints: agentConstraints(requested), edits: [{ kind: 'exclude', symbol: 'X' }] })).not.toMatch(/\d/)
    }
  })
})

describe('the Proposal Agent never claims a harvest its own buys foreclose', () => {
  const account = (id: string) => accounts.find((a) => a.id === id)!
  /** Securities the Harvest Scanner flags in any account of this account's wash-sale taxpayer. */
  const flaggedFor = (id: string) => new Set(sameWashSaleTaxpayer(account(id)).flatMap(harvestOpportunities).map((o) => o.position.symbol))

  it('the Johnson draft buys AGG while the Brief flags AGG as a harvest, and says so', () => {
    const built = buildVersion('acc-002', agentConstraints([]), [])
    if (!built.ok) throw new Error(built.message)
    expect(built.built.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'AGG')).toBe(true)
    expect(flaggedFor('acc-002').has('AGG')).toBe(true)
    expect(draftSummary('acc-002', built.built)).toContain('iShares Core US Aggregate Bond ETF is bought here, so its loss cannot be harvested for thirty days without a wash sale.')
  })

  it.each(accounts.map((a) => a.id))('%s: no "harvests losses first", and a caveat exactly when a buy forecloses a flagged harvest', (id) => {
    const flagged = flaggedFor(id)
    for (const requested of [[], [{ kind: 'harvest_only' as const }], [{ kind: 'cap_realised_gains' as const, usd: 10_000 }]]) {
      const built = buildVersion(id, agentConstraints(requested), [])
      if (!built.ok) throw new Error(built.message)
      const forecloses = built.built.preview.trades.filter((t) => t.side === 'buy' && isSubjectToWashSale(t.symbol) && flagged.has(t.symbol))
      const summaries = [revisionSummary(agentConstraints(requested), built.built), ...(requested.length === 0 ? [draftSummary(id, built.built)] : [])]
      for (const summary of summaries) {
        expect(summary).not.toMatch(/harvests losses first/)
        expect(summary).not.toMatch(/\d/)
        expect(summary.includes('cannot be harvested for thirty days without a wash sale')).toBe(forecloses.length > 0)
        for (const t of forecloses) expect(summary).toContain(claimNameOf(t.symbol, t.name))
      }
    }
  })
})
