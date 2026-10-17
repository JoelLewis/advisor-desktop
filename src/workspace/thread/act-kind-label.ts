import type { BindingAct, BindingActKind, Person } from '@/types/workspace'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'

export const RECORD_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approval',
  withdraw_approval: 'Approval withdrawn',
  send_to_party: 'Message sent',
  deliver_disclosure: 'Disclosure delivered',
  accept_proposal: 'Proposal accepted (agreement awaiting signature)',
  file_meeting_record: 'Meeting record filed',
  resolve_break: 'Break resolved',
  release_orders: 'Release',
  return_to_advisor: 'Returned to advisor',
  escalate: 'Escalated',
  dispose_alert: 'Alert closed',
  review_correspondence: 'Correspondence reviewed',
}

/** The two sign-offs: the advisor's approval and compliance's release. Everything else is a record. */
const SIGN_OFFS: ReadonlySet<BindingActKind> = new Set<BindingActKind>(['approve_proposal', 'release_orders'])

export type ActWording = { kind: string; title: string; archive: string; trailLabel: string }

/**
 * How a recorded act reads to its viewer. The firm sees the record and its supervisory archive; an
 * outside party sees what reached them, kept as a record, in their own terms.
 */
export function actWording(act: BindingAct, actor: Person, forParty: boolean): ActWording {
  if (!forParty) {
    const label = RECORD_KIND_LABEL[act.kind]
    return { kind: `${label} · ${SIGN_OFFS.has(act.kind) ? 'sign-off' : 'record'}`, title: act.summary, archive: 'Supervisory review', trailLabel: label }
  }
  const documents = (act.delivers ?? []).map((d) => DISCLOSURE_TITLES[d]).join(', ')
  switch (act.kind) {
    case 'deliver_disclosure':
      return { kind: `Document from ${actor.name}`, title: `${documents} delivered to you`, archive: 'Retained as a record', trailLabel: `Document from ${actor.name}` }
    case 'accept_proposal':
      return { kind: `Acceptance by ${actor.name}`, title: 'You accepted the proposal (agreement awaiting signature)', archive: 'Retained as a record', trailLabel: `Acceptance by ${actor.name}` }
    default:
      return { kind: `Message from ${actor.name}`, title: documents ? `Sent to you, with ${documents}` : 'Sent to you', archive: 'Retained as a record', trailLabel: `Message from ${actor.name}` }
  }
}
