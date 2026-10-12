import type { BindingAct, Message } from '@/types/workspace'
import type { ApprovalRecord, Proposal, StagedOrder } from '@/types/workspace-proposal'
import { can, personById } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { activeApproval, nextStagedId, proposalById } from '@/mocks/data/proposals-store'
import { canSeeThread } from './visibility'

export type ActFailure = { ok: false; status: 403 | 404 | 409; code: string; message: string }
type Recorded = { ok: true; act: BindingAct }

const NOT_FOUND: ActFailure = { ok: false, status: 404, code: 'NO_PROPOSAL', message: 'Proposal not found.' }

export function visibleProposal(viewerId: string, proposalId: string): Proposal | undefined {
  const proposal = proposalById(proposalId)
  if (!proposal || personById(viewerId)?.role === 'client') return undefined
  const thread = store().threads.find((t) => t.id === proposal.threadId)
  return thread && canSeeThread(viewerId, thread) ? proposal : undefined
}

function record(act: BindingAct): void {
  const s = store()
  s.acts.push(act)
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: act.threadId, at: nextAt(), actId: act.id }
  s.messages.push(marker)
}

function withdrawStaging(actId: string): void {
  const s = store()
  s.staged = s.staged.map((o) => (o.approvalActId === actId && o.status === 'pending_compliance' ? { ...o, status: 'withdrawn' } : o))
}

function setStatus(approval: ApprovalRecord, status: ApprovalRecord['status']): void {
  const s = store()
  s.approvals = s.approvals.map((a) => (a === approval ? { ...a, status } : a))
}

export function approveProposal(viewerId: string, proposalId: string, version: number, fingerprint: string): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  if (!can(viewerId, 'approve_proposal')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can approve a proposal.' }
  const v = proposal.versions.find((x) => x.n === version)
  if (!v) return { ok: false, status: 404, code: 'NO_VERSION', message: `There is no v${version} of this proposal.` }
  if (v.fingerprint !== fingerprint) return { ok: false, status: 409, code: 'FINGERPRINT_MISMATCH', message: `v${version} is not the content you reviewed. Open it again before approving.` }
  if (v.pretrade.violations.some((x) => x.severity === 'block')) return { ok: false, status: 409, code: 'BLOCKED', message: `The pre-trade check blocks v${version}; it cannot be approved.` }
  if (v.preview.trades.length === 0) return { ok: false, status: 409, code: 'NO_LEGS', message: `v${version} has no legs to approve.` }
  const previous = activeApproval(proposal.id)
  if (previous?.version === version) return { ok: false, status: 409, code: 'ALREADY_APPROVED', message: `v${version} is already approved (${previous.actId}).` }

  const at = nextAt()
  const actId = commitActId()
  if (previous) {
    setStatus(previous, 'superseded')
    withdrawStaging(previous.actId)
  }
  const act: BindingAct = {
    id: actId, kind: 'approve_proposal', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version, fingerprint: v.fingerprint,
    summary: previous
      ? `Approved v${version} of the ${proposal.title}; the approval of v${previous.version} is withdrawn`
      : `Approved v${version} of the ${proposal.title}`,
  }
  const s = store()
  s.approvals.push({ proposalId: proposal.id, version, fingerprint: v.fingerprint, actId, approverId: viewerId, at, status: 'active' })
  // Staged, never released: Phase 4 adds the compliance disposition and release.
  const staged: StagedOrder[] = v.preview.trades.map((t) => ({
    id: nextStagedId(), proposalId: proposal.id, version, accountId: proposal.accountId, symbol: t.symbol, side: t.side,
    quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: at, approvalActId: actId,
  }))
  s.staged.push(...staged)
  record(act)
  return { ok: true, act }
}

export function withdrawApproval(viewerId: string, proposalId: string): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const active = activeApproval(proposal.id)
  if (!active) return { ok: false, status: 409, code: 'NOT_APPROVED', message: 'No version of this proposal is approved.' }
  if (!can(viewerId, 'withdraw_approval') || active.approverId !== viewerId) {
    return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the approver can withdraw this approval.' }
  }
  const act: BindingAct = {
    id: commitActId(), kind: 'withdraw_approval', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: active.version, fingerprint: active.fingerprint,
    summary: `Withdrew the approval of v${active.version} of the ${proposal.title}`,
  }
  setStatus(active, 'withdrawn')
  withdrawStaging(active.actId)
  record(act)
  return { ok: true, act }
}
