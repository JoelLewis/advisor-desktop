import type { Draft } from '@/types/workspace'
import type { ApprovalRecord, ApprovalState, Proposal, ProposalDetail, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { nextNumber, store } from './workspace-store'

const pad = (n: number) => String(n).padStart(4, '0')

export function proposalById(id: string): Proposal | undefined {
  return store().proposals.find((p) => p.id === id)
}

export function proposalsInThread(threadId: string): Proposal[] {
  return store().proposals.filter((p) => p.threadId === threadId)
}

export function latestVersion(proposal: Proposal): ProposalVersion {
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${proposal.id} has no versions`)
  return latest
}

export const nextProposalId = (): string => `prop-${pad(nextNumber('proposal'))}`
export const nextStagedId = (): string => `stg-${pad(nextNumber('staged'))}`

export function activeApproval(proposalId: string): ApprovalRecord | undefined {
  return store().approvals.find((a) => a.proposalId === proposalId && a.status === 'active')
}

/** Approval belongs to one exact version; a newer version leaves it on the older one. */
export function approvalState(proposal: Proposal): ApprovalState {
  const latest = latestVersion(proposal).n
  const active = activeApproval(proposal.id)
  return active
    ? { kind: 'approved', version: active.version, latestVersion: latest, approverId: active.approverId, actId: active.actId }
    : { kind: 'unapproved', latestVersion: latest }
}

export function stagedFor(proposalId: string): StagedOrder[] {
  return store().staged.filter((o) => o.proposalId === proposalId)
}

export function detailOf(proposal: Proposal): ProposalDetail {
  return { ...proposal, approval: approvalState(proposal), staged: stagedFor(proposal.id) }
}

/** A letter is current only while the exact version it was written from is the active approval. */
export function isDraftStale(draft: Draft): boolean {
  if (!draft.basis) return false
  const { proposalId, version, fingerprint } = draft.basis
  const active = activeApproval(proposalId)
  return !active || active.version !== version || active.fingerprint !== fingerprint
}
