import type { BindingAct, BindingActKind, Person } from '@/types/workspace'

export const ACT_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approve proposal',
  withdraw_approval: 'Withdraw approval',
  dispose_exception: 'Dispose exception',
  send_to_client: 'Send to client',
}

export type ActWording = { kind: string; title: string; archive: string; trailLabel: string }

/**
 * How a recorded act reads to its viewer. The firm sees the binding act and its supervisory archive;
 * a client sees a message sent to them, kept as a record, in their own terms.
 */
export function actWording(act: BindingAct, actor: Person, forClient: boolean): ActWording {
  return forClient
    ? { kind: `Message from ${actor.name}`, title: 'Sent to you', archive: 'Retained as a record', trailLabel: `Message from ${actor.name}` }
    : { kind: `${ACT_KIND_LABEL[act.kind]} · binding`, title: act.summary, archive: 'Supervisory review', trailLabel: ACT_KIND_LABEL[act.kind] }
}
