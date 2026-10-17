import type { BindingAct, Message } from '@/types/workspace'
import type { ApprovalRecord, Proposal, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { SUITABILITY_NOTE_MAX, toleranceCheckOf, type RecordedSuitability, type SuitabilityReason } from '@/lib/suitability'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { activeApproval, filledMessage, nextStagedId, proposalById, releasedApproval } from '@/mocks/data/proposals-store'
import { canSeeThread, isFirmViewer } from './visibility'

export type ActFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
type Recorded = { ok: true; act: BindingAct }

const NOT_FOUND: ActFailure = { ok: false, status: 404, code: 'NO_PROPOSAL', message: 'Proposal not found.' }

export function visibleProposal(viewerId: string, proposalId: string): Proposal | undefined {
  const proposal = proposalById(proposalId)
  if (!proposal || !isFirmViewer(viewerId)) return undefined
  const thread = store().threads.find((t) => t.id === proposal.threadId)
  return thread && canSeeThread(viewerId, thread) ? proposal : undefined
}

/** Records an act; one recorded in a thread also posts its marker there. */
export function recordAct(act: BindingAct): void {
  const s = store()
  s.acts.push(act)
  if (act.threadId === undefined) return
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: act.threadId, at: nextAt(), actId: act.id }
  s.messages.push(marker)
}

/** Closes the approval's pending orders, naming the act that closed them. */
export function closeStaging(approvalActId: string, closedByActId: string, status: 'withdrawn' | 'returned'): void {
  const s = store()
  s.staged = s.staged.map((o) => (o.approvalActId === approvalActId && o.status === 'pending_compliance' ? { ...o, status, closedByActId } : o))
}

export function setApprovalStatus(approval: ApprovalRecord, status: ApprovalRecord['status']): void {
  const s = store()
  s.approvals = s.approvals.map((a) => (a.actId === approval.actId ? { ...a, status } : a))
}

/**
 * The reason as recorded, or why it cannot be: a version whose model sits above the client's tolerance needs one, a
 * version without that check takes none, and the accounts-as-a-whole reason holds only where the check found the
 * client's whole within the band after the proposal. The figure it rests on is the check's, never the request's.
 */
function recordedSuitability(v: ProposalVersion, suitability: SuitabilityReason | undefined): { ok: true; value?: RecordedSuitability } | ActFailure {
  const gap = toleranceCheckOf(v.pretrade.violations)
  if (!gap) {
    return suitability
      ? { ok: false, status: 409, code: 'NO_SUITABILITY_GAP', message: `v${v.n} sits within the client's tolerance; there is no suitability reason to record.` }
      : { ok: true }
  }
  if (!suitability) {
    return { ok: false, status: 409, code: 'REASON_REQUIRED', message: `v${v.n} puts the account on a model above ${gap.clientName}'s tolerance; choose a suitability reason to approve it.` }
  }
  const { note } = suitability
  if (note !== undefined && (note.trim() === '' || note.length > SUITABILITY_NOTE_MAX)) {
    return { ok: false, status: 400, code: 'BAD_NOTE', message: `Write the note in 1 to ${SUITABILITY_NOTE_MAX} characters, or leave it out.` }
  }
  if (suitability.reason !== 'accounts_within_tolerance') return { ok: true, value: { ...suitability, clientName: gap.clientName } }
  if (gap.wholeAfterStatus !== 'within') {
    return { ok: false, status: 409, code: 'REASON_DOES_NOT_HOLD', message: `After v${v.n}, ${gap.clientName}'s accounts as a whole sit ${gap.wholeAfterStatus} the tolerance; choose another reason.` }
  }
  const whole = { score: gap.wholeAfterScore, today: gap.wholeTodayScore, toleranceBand: gap.toleranceBand, floor: gap.floor, ceiling: gap.ceiling }
  return { ok: true, value: { ...suitability, clientName: gap.clientName, whole } }
}

export function approveProposal(viewerId: string, proposalId: string, version: number, fingerprint: string, suitability?: SuitabilityReason): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  if (!can(viewerId, 'approve_proposal')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can approve a proposal.' }
  const released = releasedApproval(proposal.id)
  if (released) return { ok: false, status: 409, code: 'FILLED', message: filledMessage(released.version) }
  const v = proposal.versions.find((x) => x.n === version)
  if (!v) return { ok: false, status: 404, code: 'NO_VERSION', message: `There is no v${version} of this proposal.` }
  if (v.fingerprint !== fingerprint) return { ok: false, status: 409, code: 'FINGERPRINT_MISMATCH', message: `v${version} is not the content you reviewed. Open it again before approving.` }
  if (v.pretrade.violations.some((x) => x.severity === 'block')) return { ok: false, status: 409, code: 'BLOCKED', message: `The pre-trade check blocks v${version}; it cannot be approved.` }
  if (v.preview.trades.length === 0) return { ok: false, status: 409, code: 'NO_LEGS', message: `v${version} has no legs to approve.` }
  const previous = activeApproval(proposal.id)
  if (previous?.version === version) return { ok: false, status: 409, code: 'ALREADY_APPROVED', message: `v${version} is already approved (${previous.actId}).` }
  const reason = recordedSuitability(v, suitability)
  if (!reason.ok) return reason
  const recorded = reason.value ? { suitability: reason.value } : {}

  const at = nextAt()
  const actId = commitActId()
  if (previous) {
    setApprovalStatus(previous, 'superseded')
    closeStaging(previous.actId, actId, 'withdrawn')
  }
  const act: BindingAct = {
    id: actId, kind: 'approve_proposal', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version, fingerprint: v.fingerprint,
    summary: previous
      ? `Approved v${version} of the ${proposal.title}; the approval of v${previous.version} is withdrawn`
      : `Approved v${version} of the ${proposal.title}`,
    ...recorded,
  }
  const s = store()
  s.approvals.push({ proposalId: proposal.id, version, fingerprint: v.fingerprint, actId, approverId: viewerId, at, status: 'active', ...recorded })
  // Staged only: compliance's disposition releases, returns or escalates them (compliance-acts.ts).
  const staged: StagedOrder[] = v.preview.trades.map((t) => ({
    id: nextStagedId(), proposalId: proposal.id, version, accountId: proposal.accountId, symbol: t.symbol, side: t.side,
    quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: at, approvalActId: actId,
  }))
  s.staged.push(...staged)
  recordAct(act)
  return { ok: true, act }
}

export function withdrawApproval(viewerId: string, proposalId: string): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const notPermitted: ActFailure = { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the approver can withdraw this approval.' }
  if (!can(viewerId, 'withdraw_approval')) return notPermitted
  const active = activeApproval(proposal.id)
  if (!active) return { ok: false, status: 409, code: 'NOT_APPROVED', message: 'No version of this proposal is approved.' }
  if (active.approverId !== viewerId) return notPermitted
  const act: BindingAct = {
    id: commitActId(), kind: 'withdraw_approval', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: active.version, fingerprint: active.fingerprint,
    summary: `Withdrew the approval of v${active.version} of the ${proposal.title}`,
  }
  setApprovalStatus(active, 'withdrawn')
  closeStaging(active.actId, act.id, 'withdrawn')
  recordAct(act)
  return { ok: true, act }
}
