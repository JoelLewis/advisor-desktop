import type { AlertOutcome, BindingAct, CorrespondenceOutcome, Message, ViaPresenter } from '@/types/workspace'
import type { ApprovalRecord, Proposal, ProposalVersion } from '@/types/workspace-proposal'
import { can, personById } from '@/mocks/data/people'
import { advanceClockTo, commitActId, nextAt, nextId, nextNumber, sessionNow, store } from '@/mocks/data/workspace-store'
import { SUPERVISION_RECORDS } from '@/mocks/handlers/compliance'
import { actOnApproval } from '@/mocks/data/proposals-store'
import { MOCK_TODAY_ISO, eventTime, minuteOf } from '@/lib/clock'
import { isDuringNyseSession, nyseSessionUtc } from '@/lib/trading-calendar'
import { applyFills } from './fills'
import { ALERT_ACTION, alertById, alertDisposal, alertFingerprint, isOpenAlert } from './alerts'
import { latestReview, sentMessage } from './correspondence'
import { canSeeThread, isExternalViewer, isFirmViewer } from './visibility'
import { partyOfThread } from './party'
import { closeStaging, recordAct, setApprovalStatus, visibleProposal } from './proposal-acts'

export type ComplianceFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type Recorded = { ok: true; act: BindingAct }
/** How the act was performed: through the presenter shortcut, it carries the firm-only marker. */
export type ActOptions = { viaPresenter?: ViaPresenter }

const RATIONALE_MAX = 2000

const refuse = (status: ComplianceFailure['status'], code: string, message: string): ComplianceFailure => ({ ok: false, status, code, message })
const via = (options: ActOptions) => (options.viaPresenter ? { viaPresenter: options.viaPresenter } : {})

/**
 * Every record carries a rationale: something other than whitespace, and not an essay. `subject`
 * names what the act decides, so a break's refusal speaks of a break rather than a disposition.
 */
export function rationaleRefusal(rationale: string, subject: 'disposition' | 'break resolution' = 'disposition'): ComplianceFailure | undefined {
  const trimmed = rationale.trim()
  if (trimmed.length === 0) return refuse(400, 'RATIONALE_REQUIRED', `A rationale is required for every ${subject}.`)
  if (trimmed.length > RATIONALE_MAX) return refuse(400, 'RATIONALE_TOO_LONG', `Keep the rationale to ${RATIONALE_MAX} characters or fewer.`)
  return undefined
}

type OrdersKind = 'release_orders' | 'return_to_advisor' | 'escalate'
type Guarded = { ok: true; proposal: Proposal; approval: ApprovalRecord; version: ProposalVersion }

/** The id of the act that closed an approval; the engine records one for every closed approval. */
function closedBy(kind: 'release_orders' | 'return_to_advisor', approval: ApprovalRecord): string {
  const act = actOnApproval(kind, approval.actId)
  if (!act) throw new Error(`Approval ${approval.actId} is ${approval.status} with no ${kind} act`)
  return act.id
}

function notActive(approval: ApprovalRecord): ComplianceFailure | undefined {
  const v = `v${approval.version}`
  switch (approval.status) {
    case 'active': return undefined
    case 'withdrawn': return refuse(409, 'APPROVAL_WITHDRAWN', `The approval of ${v} (${approval.actId}) was withdrawn by the advisor; nothing from it can be released.`)
    case 'superseded': return refuse(409, 'APPROVAL_SUPERSEDED', `The approval of ${v} (${approval.actId}) was superseded by a newer approval. Open the queue again.`)
    case 'returned': return refuse(409, 'APPROVAL_RETURNED', `${v} was already returned to the advisor (${closedBy('return_to_advisor', approval)}).`)
    case 'released': return refuse(409, 'ALREADY_RELEASED', `The orders from ${v} were already released (${closedBy('release_orders', approval)}).`)
  }
}

function ordersGuard(viewerId: string, kind: OrdersKind, proposalId: string, approvalActId: string, fingerprint: string, rationale: string): Guarded | ComplianceFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return refuse(404, 'NO_PROPOSAL', 'Proposal not found.')
  if (!can(viewerId, kind)) return refuse(403, 'NOT_PERMITTED', 'Only compliance can release, return or escalate staged orders.')
  const badRationale = rationaleRefusal(rationale)
  if (badRationale) return badRationale
  const approval = store().approvals.find((a) => a.proposalId === proposal.id && a.actId === approvalActId)
  if (!approval) return refuse(409, 'NOT_THIS_APPROVAL', `${approvalActId} is not an approval of the ${proposal.title}.`)
  const stale = notActive(approval)
  if (stale) return stale
  if (approval.fingerprint !== fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', `The evidence you reviewed is not v${approval.version} as approved. Open it again.`)
  const version = proposal.versions.find((v) => v.n === approval.version)
  if (!version) throw new Error(`Approval ${approval.actId} names a missing version`)
  return { ok: true, proposal, approval, version }
}

/**
 * The event-clock sequences `count` fills take: after the `pending` events still to be recorded
 * ahead of them, and never before the NYSE opens today. Undefined when the session would close first.
 */
function sessionSequences(pending: number, count: number): number[] | undefined {
  const first = Math.max(store().sequence + pending + 1, minuteOf(nyseSessionUtc(MOCK_TODAY_ISO).open))
  const sequences = Array.from({ length: count }, (_, i) => first + i)
  // Fills are priced at the frozen day's close: a session on any later day (after a clock jump) is out of scope.
  return sequences.every((n) => eventTime(n).slice(0, 10) === MOCK_TODAY_ISO && isDuringNyseSession(eventTime(n))) ? sequences : undefined
}

/** Why no session prices the fills: the frozen day's has closed, or a clock jump has left the frozen day behind. */
const marketClosedMessage = () => sessionNow().slice(0, 10) > MOCK_TODAY_ISO
  ? 'Fills are priced only in the 25 Feb session; after a clock jump, staged orders stay staged.'
  : "Today's session has closed; staged orders can be released at the next session."

export function releaseOrders(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const guard = ordersGuard(viewerId, 'release_orders', proposalId, approvalActId, fingerprint, rationale)
  if (!guard.ok) return guard
  const { proposal, approval, version } = guard
  const orders = store().staged.filter((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')
  // The act and its marker come first; the fills follow, at the open if the release is before it.
  const sequences = sessionSequences(2, orders.length)
  if (!sequences) return refuse(409, 'MARKET_CLOSED', marketClosedMessage())
  // Applied before anything is recorded: a fill that would break the ledger throws and records
  // nothing, the clock included. `sessionSequences` has already kept the act's and marker's times.
  const fills = applyFills({ accountId: proposal.accountId, proposalId: proposal.id, version, orders, times: sequences.map(eventTime) })
  const at = nextAt()
  const markerAt = nextAt()
  advanceClockTo(sequences[sequences.length - 1] ?? store().sequence)
  const act: BindingAct = {
    id: commitActId(), kind: 'release_orders', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: approval.version, fingerprint: approval.fingerprint,
    summary: `Released the orders staged from v${approval.version} of the ${proposal.title}`,
    rationale: rationale.trim(), approvalActId: approval.actId, ...via(options),
  }
  const s = store()
  s.acts.push(act)
  s.messages.push({ kind: 'act', id: nextId('msg'), threadId: proposal.threadId, at: markerAt, actId: act.id })
  const fillOf = new Map(fills.map((f) => [f.stagedOrderId, f.id]))
  s.staged = s.staged.map((o) => {
    const fillId = fillOf.get(o.id)
    return fillId ? { ...o, status: 'filled', closedByActId: act.id, fillId } : o
  })
  setApprovalStatus(approval, 'released')
  const report: Message = {
    kind: 'fills', id: nextId('msg'), threadId: proposal.threadId, at: nextAt(), proposalId: proposal.id,
    title: proposal.title, version: approval.version, releaseActId: act.id, fills,
  }
  s.messages.push(report)
  return { ok: true, act }
}

export function returnToAdvisor(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const guard = ordersGuard(viewerId, 'return_to_advisor', proposalId, approvalActId, fingerprint, rationale)
  if (!guard.ok) return guard
  const { proposal, approval } = guard
  const act: BindingAct = {
    id: commitActId(), kind: 'return_to_advisor', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: approval.version, fingerprint: approval.fingerprint,
    summary: `Returned v${approval.version} of the ${proposal.title} to the advisor; the approval is withdrawn`,
    rationale: rationale.trim(), approvalActId: approval.actId, ...via(options),
  }
  setApprovalStatus(approval, 'returned')
  closeStaging(approval.actId, act.id, 'returned')
  recordAct(act)
  return { ok: true, act }
}

export function escalate(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const guard = ordersGuard(viewerId, 'escalate', proposalId, approvalActId, fingerprint, rationale)
  if (!guard.ok) return guard
  const { proposal, approval } = guard
  const earlier = actOnApproval('escalate', approval.actId)
  if (earlier) return refuse(409, 'ALREADY_ESCALATED', `The orders from v${approval.version} are already escalated (${earlier.id}).`)
  const act: BindingAct = {
    id: commitActId(), kind: 'escalate', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: approval.version, fingerprint: approval.fingerprint,
    summary: `Escalated the orders staged from v${approval.version} of the ${proposal.title}; they stay held`,
    rationale: rationale.trim(), approvalActId: approval.actId, ...via(options),
  }
  recordAct(act)
  return { ok: true, act }
}

const ALERT_SUMMARY: Readonly<Record<AlertOutcome, (title: string) => string>> = {
  approve: (title) => `Approved the alert: ${title}`,
  reject: (title) => `Rejected the alert: ${title}`,
  request_changes: (title) => `Requested changes on the alert: ${title}`,
}

export function disposeAlert(viewerId: string, alertId: string, outcome: AlertOutcome, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const alert = alertById(alertId)
  if (!alert || !isFirmViewer(viewerId)) return refuse(404, 'NO_ALERT', 'Alert not found.')
  if (!can(viewerId, 'dispose_alert')) return refuse(403, 'NOT_PERMITTED', 'Only compliance can dispose of an alert.')
  const badRationale = rationaleRefusal(rationale)
  if (badRationale) return badRationale
  if (!isOpenAlert(alert)) {
    const earlier = alertDisposal(alert.id)
    return refuse(409, 'ALREADY_DISPOSED', earlier ? `${alert.id} was already disposed of (${earlier.id}).` : `${alert.id} is already closed.`)
  }
  if (alertFingerprint(alert) !== fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', 'The alert or its record trail changed since you opened it. Open it again.')
  const reviewer = personById(viewerId)
  if (!reviewer) throw new Error(`No person ${viewerId}`)
  const act: BindingAct = {
    id: commitActId(), kind: 'dispose_alert', actorId: viewerId, at: nextAt(), subject: { type: 'alert', id: alert.id },
    fingerprint, summary: ALERT_SUMMARY[outcome](alert.title), rationale: rationale.trim(), outcome, ...via(options),
  }
  recordAct(act)
  store().supervisionRecords.push({
    id: `sr-${String(SUPERVISION_RECORDS.length + nextNumber('record')).padStart(3, '0')}`, alertId: alert.id,
    reviewerId: viewerId, reviewer: `${reviewer.name} (CCO)`, action: ALERT_ACTION[outcome], notes: rationale.trim(), timestamp: act.at,
  })
  return { ok: true, act }
}

export function reviewCorrespondence(viewerId: string, messageId: string, outcome: CorrespondenceOutcome, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const sent = sentMessage(messageId)
  if (!sent || isExternalViewer(viewerId) || !canSeeThread(viewerId, sent.thread)) return refuse(404, 'NO_MESSAGE', 'Message not found.')
  if (!can(viewerId, 'review_correspondence')) return refuse(403, 'NOT_PERMITTED', 'Only compliance can review correspondence with a client or prospect.')
  const badRationale = rationaleRefusal(rationale)
  if (badRationale) return badRationale
  const last = latestReview(messageId)
  if (last?.outcome === 'reviewed') return refuse(409, 'ALREADY_REVIEWED', `This message was already reviewed (${last.id}).`)
  if (last?.outcome === 'flagged' && outcome === 'flagged') return refuse(409, 'ALREADY_FLAGGED', `This message is already flagged (${last.id}).`)
  if (sent.act.fingerprint !== fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', 'This is not the message as it was sent. Open it again.')
  const party = partyOfThread(sent.thread)
  const act: BindingAct = {
    id: commitActId(), kind: 'review_correspondence', actorId: viewerId, at: nextAt(), subject: { type: 'message', id: messageId },
    fingerprint, summary: outcome === 'reviewed' ? `Reviewed the message sent to ${party.name}` : `Flagged the message sent to ${party.name} for follow-up`,
    rationale: rationale.trim(), outcome, ...via(options),
  }
  recordAct(act)
  return { ok: true, act }
}
