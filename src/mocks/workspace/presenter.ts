import type { PresenterItem, SupervisionItemKind } from '@/types/workspace-supervision'
import { CCO_ID, PRESENTER_ID, personById } from '@/mocks/data/people'
import { activeApproval, releasedApproval } from '@/mocks/data/proposals-store'
import { alertById, alertFingerprint } from './alerts'
import { disposeAlert, releaseOrders, reviewCorrespondence, type ComplianceFailure, type Recorded } from './compliance-acts'
import { sentMessage } from './correspondence'
import { visibleProposal } from './proposal-acts'
import { canSeeThread } from './visibility'

/** What Mark writes when the presenter acts for him: the review his default disposition rests on. */
export const CCO_DEFAULT_RATIONALE: Readonly<Record<SupervisionItemKind, string>> = {
  orders: 'Reviewed the approved version, its legs, tax effect, pre-trade reading and repurchase restrictions. Released for execution.',
  alert: 'Reviewed the alert, its record trail and the account context. Approved.',
  correspondence: 'Reviewed the message as the client received it, with its provenance. No follow-up needed.',
}

const refuse = (status: ComplianceFailure['status'], code: string, message: string): ComplianceFailure => ({ ok: false, status, code, message })

/**
 * The one-presenter demo: Mark's default disposition of an item the presenter can see, recorded as
 * Mark (`cco-001`) with the firm-only `viaPresenter` marker naming who pressed it. Only the presenter may press it.
 */
export function actAsCco(presenterId: string, item: PresenterItem): Recorded | ComplianceFailure {
  const presenter = personById(presenterId)
  if (!presenter || presenter.role === 'client') return refuse(404, 'NOT_FOUND', 'Not found.')
  if (presenterId !== PRESENTER_ID) return refuse(403, 'NOT_PERMITTED', 'Only the presenter can act as the compliance officer.')
  const options = { viaPresenter: { presenterId } }
  switch (item.kind) {
    case 'orders': {
      const proposal = visibleProposal(presenterId, item.id)
      if (!proposal) return refuse(404, 'NO_PROPOSAL', 'Proposal not found.')
      // A released approval is passed on so a repeated release is refused as already released, naming the first.
      const approval = activeApproval(proposal.id) ?? releasedApproval(proposal.id)
      if (!approval) return refuse(409, 'NOT_AWAITING_RELEASE', 'Nothing from this proposal is awaiting release.')
      return releaseOrders(CCO_ID, proposal.id, approval.actId, approval.fingerprint, CCO_DEFAULT_RATIONALE.orders, options)
    }
    case 'alert': {
      const alert = alertById(item.id)
      if (!alert) return refuse(404, 'NO_ALERT', 'Alert not found.')
      return disposeAlert(CCO_ID, alert.id, 'approve', alertFingerprint(alert), CCO_DEFAULT_RATIONALE.alert, options)
    }
    case 'correspondence': {
      const sent = sentMessage(item.id)
      if (!sent || !canSeeThread(presenterId, sent.thread)) return refuse(404, 'NO_MESSAGE', 'Message not found.')
      return reviewCorrespondence(CCO_ID, sent.message.id, 'reviewed', sent.act.fingerprint, CCO_DEFAULT_RATIONALE.correspondence, options)
    }
  }
}
