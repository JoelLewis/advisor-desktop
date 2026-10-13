import type { ComplianceActKind } from '@/types/workspace'
import type { ComplianceActRequest, SupervisionItem } from '@/types/workspace-supervision'

/** One disposition compliance may record on an item, with the request it sends. */
export type DispositionOption = { value: string; act: ComplianceActKind; label: string; consequence: string; request: (rationale: string) => ComplianceActRequest }

/** The dispositions an open item admits; an item no longer open admits none. */
export function dispositionOptions(item: SupervisionItem, open: boolean): DispositionOption[] {
  if (!open) return []
  switch (item.kind) {
    case 'orders': {
      const orders = (kind: 'release_orders' | 'return_to_advisor' | 'escalate') => (rationale: string): ComplianceActRequest =>
        ({ kind, proposalId: item.proposalId, approvalActId: item.approval.actId, fingerprint: item.fingerprint, rationale })
      return [
        { value: 'release_orders', act: 'release_orders', label: 'Release orders', consequence: "The staged orders are released and fill at the day's prices. The book moves.", request: orders('release_orders') },
        { value: 'return_to_advisor', act: 'return_to_advisor', label: 'Return to advisor', consequence: 'The approval is withdrawn and the staged orders are returned to the advisor.', request: orders('return_to_advisor') },
        ...(item.escalation ? [] : [{ value: 'escalate', act: 'escalate' as const, label: 'Escalate', consequence: 'The orders stay held, and the item is marked escalated.', request: orders('escalate') }]),
      ]
    }
    case 'alert': {
      const alert = (outcome: 'approve' | 'reject' | 'request_changes') => (rationale: string): ComplianceActRequest =>
        ({ kind: 'dispose_alert', alertId: item.id, outcome, fingerprint: item.fingerprint, rationale })
      return [
        { value: 'approve', act: 'dispose_alert', label: 'Approve', consequence: 'The alert is closed as approved, and the disposition joins its record trail.', request: alert('approve') },
        { value: 'reject', act: 'dispose_alert', label: 'Reject', consequence: 'The alert is closed as rejected, and the disposition joins its record trail.', request: alert('reject') },
        { value: 'request_changes', act: 'dispose_alert', label: 'Request changes', consequence: 'The alert goes back to the advisor for changes, and the request joins its record trail.', request: alert('request_changes') },
      ]
    }
    case 'correspondence': {
      const review = (outcome: 'reviewed' | 'flagged') => (rationale: string): ComplianceActRequest =>
        ({ kind: 'review_correspondence', messageId: item.id, outcome, fingerprint: item.fingerprint, rationale })
      return [
        { value: 'reviewed', act: 'review_correspondence', label: 'Mark reviewed', consequence: 'The message is marked reviewed and leaves the queue.', request: review('reviewed') },
        ...(item.flagged ? [] : [{ value: 'flagged', act: 'review_correspondence' as const, label: 'Flag for follow-up', consequence: 'The message is flagged for follow-up and stays in the queue.', request: review('flagged') }]),
      ]
    }
  }
}
