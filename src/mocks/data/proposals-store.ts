import type { BindingAct, BindingActKind, Draft } from '@/types/workspace'
import type { ApprovalRecord, ApprovalState, Escalation, Proposal, ProposalDetail, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { ledgerFills } from './portfolio-ledger'
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

export function releasedApproval(proposalId: string): ApprovalRecord | undefined {
  return store().approvals.find((a) => a.proposalId === proposalId && a.status === 'released')
}

/** The act of `kind` that acted on the approval recorded as `approvalActId`. */
export function actOnApproval(kind: BindingActKind, approvalActId: string): BindingAct | undefined {
  return store().acts.find((a) => a.kind === kind && a.approvalActId === approvalActId)
}

export function escalationOf(approvalActId: string): Escalation | undefined {
  const act = actOnApproval('escalate', approvalActId)
  return act ? { actId: act.id, at: act.at } : undefined
}

/** Approval belongs to one exact version; a newer version leaves it on the older one. Released orders close the proposal. */
export function approvalState(proposal: Proposal): ApprovalState {
  const latest = latestVersion(proposal).n
  const active = activeApproval(proposal.id)
  if (active) return { kind: 'approved', version: active.version, latestVersion: latest, approverId: active.approverId, actId: active.actId }
  const released = releasedApproval(proposal.id)
  const release = released && actOnApproval('release_orders', released.actId)
  return released && release
    ? { kind: 'released', version: released.version, latestVersion: latest, approverId: released.approverId, actId: released.actId, releaseActId: release.id }
    : { kind: 'unapproved', latestVersion: latest }
}

function stagedFor(proposalId: string): StagedOrder[] {
  return store().staged.filter((o) => o.proposalId === proposalId)
}

export function detailOf(proposal: Proposal): ProposalDetail {
  const active = activeApproval(proposal.id)
  const escalation = active && escalationOf(active.actId)
  return {
    ...proposal, approval: approvalState(proposal), staged: stagedFor(proposal.id),
    fills: ledgerFills().filter((f) => f.proposalId === proposal.id),
    ...(escalation ? { escalation } : {}),
  }
}

/** A letter is current only while the exact version it was written from is the active approval. */
export function isDraftStale(draft: Draft): boolean {
  if (!draft.basis) return false
  const { proposalId, version, fingerprint } = draft.basis
  const active = activeApproval(proposalId)
  return !active || active.version !== version || active.fingerprint !== fingerprint
}

/** Why a filled proposal refuses every change: its orders were filled, so the next proposal starts from the moved book. */
export const filledMessage = (version: number): string =>
  `The orders from v${version} were filled; this proposal is closed. Ask the Proposal Agent for a new one from the moved book.`
