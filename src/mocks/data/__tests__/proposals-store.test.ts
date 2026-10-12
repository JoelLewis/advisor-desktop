import { describe, it, expect, beforeEach } from 'vitest'
import type { Draft } from '@/types/workspace'
import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'
import { resetWorkspaceStore, store } from '../workspace-store'
import {
  activeApproval, approvalState, detailOf, isDraftStale, latestVersion, nextProposalId, nextStagedId, proposalById, proposalsInThread,
} from '../proposals-store'

function version(n: number, fingerprint: string): ProposalVersion {
  return {
    n, author: { kind: 'agent', agentId: 'proposal' }, createdAt: '2026-02-25T12:05:00.000Z', constraints: [{ kind: 'avoid_self_wash' }], edits: [],
    preview: {
      accountId: 'acc-002', currency: 'USD', trades: [], estimatedTaxImpact: 0, ytdRealisedOnReturn: null, nettedWithAccountIds: [], grossTaxOnGains: 0,
      taxable: true, repurchaseRestrictions: [],
      projectedDrift: { driftTolerance: 0.05, driftThreshold: 0.005, totalDrift: 0, maxAbsDrift: 0, withinBand: true, assetClassDrifts: [] },
    },
    pretrade: { accountId: 'acc-002', passed: true, violations: [], legs: [], projectedCash: 0, projectedCashPct: 0, minimumCash: 0 },
    legFacts: [], excludedLegs: [],
    summary: { sold: 0, bought: 0, gains: 0, losses: 0, netShortTerm: 0, netLongTerm: 0, washed: 0, grossTax: 0, netTax: 0 },
    fingerprint, changeSummary: 'Drafted a rebalance.',
  }
}

function seedProposal(): Proposal {
  const proposal: Proposal = {
    id: nextProposalId(), title: 'Johnson rebalance', accountId: 'acc-002', clientId: 'cli-001', threadId: 'th-johnson-review',
    versions: [version(1, 'AAAAAAAA')],
  }
  store().proposals.push(proposal)
  return proposal
}

const letter = (basis: Draft['basis']): Draft => ({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'x', createdAt: 'x', agentId: 'client-letter', basis })

describe('proposals store', () => {
  beforeEach(() => resetWorkspaceStore())

  it('starts empty and resets with the workspace store', () => {
    expect(store().proposals).toEqual([])
    expect(store().approvals).toEqual([])
    expect(store().staged).toEqual([])
    seedProposal()
    resetWorkspaceStore()
    expect(store().proposals).toEqual([])
    expect(nextProposalId()).toBe('prop-0001')
  })

  it('allocates proposal and staged-order ids in sequence', () => {
    expect(nextProposalId()).toBe('prop-0001')
    expect(nextProposalId()).toBe('prop-0002')
    expect(nextStagedId()).toBe('stg-0001')
  })

  it('finds proposals by id and by thread, and the latest version', () => {
    const p = seedProposal()
    p.versions.push(version(2, 'BBBBBBBB'))
    expect(proposalById(p.id)).toBe(p)
    expect(proposalById('prop-9999')).toBeUndefined()
    expect(proposalsInThread('th-johnson-review').map((x) => x.id)).toEqual([p.id])
    expect(proposalsInThread('th-robert')).toEqual([])
    expect(latestVersion(p).n).toBe(2)
  })

  it('reports approval state: none, the latest, or an older version with the newer unapproved', () => {
    const p = seedProposal()
    expect(approvalState(p)).toEqual({ kind: 'unapproved', latestVersion: 1 })
    store().approvals.push({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA', actId: 'REC-0001', approverId: 'user-001', at: 'x', status: 'active' })
    expect(approvalState(p)).toEqual({ kind: 'approved', version: 1, latestVersion: 1, approverId: 'user-001', actId: 'REC-0001' })
    p.versions.push(version(2, 'BBBBBBBB'))
    expect(approvalState(p)).toEqual({ kind: 'approved', version: 1, latestVersion: 2, approverId: 'user-001', actId: 'REC-0001' })
    store().approvals = store().approvals.map((a) => ({ ...a, status: 'withdrawn' as const }))
    expect(activeApproval(p.id)).toBeUndefined()
    expect(approvalState(p)).toEqual({ kind: 'unapproved', latestVersion: 2 })
  })

  it('serves a detail with its approval state and staged orders', () => {
    const p = seedProposal()
    store().staged.push({ id: 'stg-0001', proposalId: p.id, version: 1, accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 7000, estimatedValue: 199150, currency: 'USD', status: 'pending_compliance', stagedAt: 'x', approvalActId: 'REC-0001' })
    const detail = detailOf(p)
    expect(detail.approval.kind).toBe('unapproved')
    expect(detail.staged.map((s) => s.id)).toEqual(['stg-0001'])
  })

  it('a letter is stale unless its exact version is the active approval', () => {
    const p = seedProposal()
    expect(isDraftStale({ ...letter(undefined), agentId: undefined })).toBe(false)
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA' }))).toBe(true)
    store().approvals.push({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA', actId: 'REC-0001', approverId: 'user-001', at: 'x', status: 'active' })
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA' }))).toBe(false)
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'CCCCCCCC' }))).toBe(true)
    expect(isDraftStale(letter({ proposalId: 'prop-9999', version: 1, fingerprint: 'AAAAAAAA' }))).toBe(true)
  })
})
