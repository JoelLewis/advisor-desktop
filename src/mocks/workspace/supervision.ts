import type { AlertSeverity, ComplianceAlert } from '@/types/compliance'
import type { BindingAct, BindingActKind } from '@/types/workspace'
import type { ApprovalRecord, Proposal } from '@/types/workspace-proposal'
import type { AlertItem, CorrespondenceItem, OrdersItem, SupervisionItem, SupervisionQueue } from '@/types/workspace-supervision'
import { accounts } from '@/mocks/data/accounts'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { escalationOf, latestVersion } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { alertById, alertContext, alertDisposal, alertFingerprint, isAlertOutcome, isOpenAlert, recordTrailFor } from './alerts'
import { latestReview, sentMessage, sentMessages, type SentMessage } from './correspondence'
import { visibleProposal } from './proposal-acts'
import { canSeeThread, isFirmViewer } from './visibility'
import { partyOfThread } from './party'

export const COMPLIANCE_ACT_KINDS: ReadonlySet<BindingActKind> = new Set(['release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'])

const SEVERITY_ORDER: Readonly<Record<AlertSeverity, number>> = { critical: 0, warning: 1, info: 2 }

export function ordersItem(proposal: Proposal, approval: ApprovalRecord): OrdersItem {
  const version = proposal.versions.find((v) => v.n === approval.version)
  const account = accounts.find((a) => a.id === proposal.accountId)
  if (!version || !account) throw new Error(`Approval ${approval.actId} names a missing version or account`)
  const escalation = escalationOf(approval.actId)
  return {
    kind: 'orders', id: proposal.id, title: `${proposal.title} · v${approval.version}`, proposalId: proposal.id,
    accountId: account.id, accountName: account.name, clientId: proposal.clientId, threadId: proposal.threadId,
    approval, version, latestVersion: latestVersion(proposal).n,
    staged: store().staged.filter((o) => o.approvalActId === approval.actId),
    fills: ledgerFills().filter((f) => f.proposalId === proposal.id && f.version === approval.version),
    ...(escalation ? { escalation } : {}),
    fingerprint: approval.fingerprint,
  }
}

export function alertItem(alert: ComplianceAlert): AlertItem {
  const outcome = alertDisposal(alert.id)?.outcome
  return {
    kind: 'alert', id: alert.id, title: alert.title, alert, trail: recordTrailFor(alert.id), context: alertContext(alert),
    ...(isAlertOutcome(outcome) ? { disposition: outcome } : {}),
    fingerprint: alertFingerprint(alert),
  }
}

export function correspondenceItem(sent: SentMessage): CorrespondenceItem {
  const party = partyOfThread(sent.thread)
  return {
    kind: 'correspondence', id: sent.message.id, title: `Message to ${party.name}`, threadId: sent.thread.id,
    clientId: party.id, clientName: party.name, message: sent.message, sendAct: sent.act,
    flagged: latestReview(sent.message.id)?.outcome === 'flagged', fingerprint: sent.act.fingerprint,
  }
}

/** The item a compliance act disposed of, as it stands now, when the viewer may see it. */
function itemOf(viewerId: string, act: BindingAct): SupervisionItem | undefined {
  const subject = act.subject
  if (subject?.type === 'proposal') {
    const proposal = visibleProposal(viewerId, subject.id)
    const approval = store().approvals.find((a) => a.actId === act.approvalActId)
    return proposal && approval ? ordersItem(proposal, approval) : undefined
  }
  if (subject?.type === 'alert') {
    const alert = alertById(subject.id)
    return alert ? alertItem(alert) : undefined
  }
  if (subject?.type === 'message') {
    const sent = sentMessage(subject.id)
    return sent && canSeeThread(viewerId, sent.thread) ? correspondenceItem(sent) : undefined
  }
  return undefined
}

/** The queue as the viewer may read it. Every firm viewer reads it; only compliance acts on it. */
export function supervisionQueue(viewerId: string): SupervisionQueue | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const s = store()
  const orders = s.approvals.filter((a) => a.status === 'active').flatMap((approval) => {
    const proposal = visibleProposal(viewerId, approval.proposalId)
    const pending = s.staged.some((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')
    return proposal && pending ? [ordersItem(proposal, approval)] : []
  })
  const alerts = complianceAlerts
    .filter(isOpenAlert)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.createdAt.localeCompare(a.createdAt))
    .map(alertItem)
  const correspondence = sentMessages()
    .filter((m) => canSeeThread(viewerId, m.thread) && latestReview(m.message.id)?.outcome !== 'reviewed')
    .map(correspondenceItem)
  const disposedToday = s.acts
    .filter((a) => COMPLIANCE_ACT_KINDS.has(a.kind) && a.at.slice(0, 10) === MOCK_TODAY_ISO)
    .reverse()
    .flatMap((act) => {
      const item = itemOf(viewerId, act)
      return item ? [{ item, act }] : []
    })
  return { orders, alerts, correspondence, disposedToday }
}
