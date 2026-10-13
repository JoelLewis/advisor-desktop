import type { BindingAct, BindingActKind, Person } from '@/types/workspace'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'

export const ACT_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approve proposal',
  withdraw_approval: 'Withdraw approval',
  send_to_party: 'Send to client or prospect',
  deliver_disclosure: 'Deliver disclosure',
  accept_proposal: 'Accept proposal',
  file_meeting_record: 'File meeting record',
  release_orders: 'Release orders',
  return_to_advisor: 'Return to advisor',
  escalate: 'Escalate',
  dispose_alert: 'Dispose alert',
  review_correspondence: 'Review correspondence',
}

export type ActWording = { kind: string; title: string; archive: string; trailLabel: string }

/**
 * How a recorded act reads to its viewer. The firm sees the binding act and its supervisory archive; an
 * outside party sees what reached them, kept as a record, in their own terms.
 */
export function actWording(act: BindingAct, actor: Person, forParty: boolean): ActWording {
  if (!forParty) return { kind: `${ACT_KIND_LABEL[act.kind]} · binding`, title: act.summary, archive: 'Supervisory review', trailLabel: ACT_KIND_LABEL[act.kind] }
  const documents = (act.delivers ?? []).map((d) => DISCLOSURE_TITLES[d]).join(', ')
  switch (act.kind) {
    case 'deliver_disclosure':
      return { kind: `Document from ${actor.name}`, title: `${documents} delivered to you`, archive: 'Retained as a record', trailLabel: `Document from ${actor.name}` }
    case 'accept_proposal':
      return { kind: `Acceptance by ${actor.name}`, title: 'You accepted the proposal', archive: 'Retained as a record', trailLabel: `Acceptance by ${actor.name}` }
    default:
      return { kind: `Message from ${actor.name}`, title: documents ? `Sent to you, with ${documents}` : 'Sent to you', archive: 'Retained as a record', trailLabel: `Message from ${actor.name}` }
  }
}
