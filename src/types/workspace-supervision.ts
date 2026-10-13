import type { ComplianceAlert, SupervisionRecord } from './compliance'
import type { AlertOutcome, BindingAct, BindingActKind, CorrespondenceOutcome, Message } from './workspace'
import type { ApprovalRecord, Escalation, Fill, ProposalVersion, StagedOrder } from './workspace-proposal'

export type TextMessage = Extract<Message, { kind: 'text' }>

/** Orders staged from one approval, as compliance reviews them: the approval record and the version it names, never re-run. */
export type OrdersItem = {
  kind: 'orders'
  /** The proposal id. */
  id: string
  title: string
  proposalId: string
  accountId: string
  accountName: string
  clientId: string
  threadId: string
  approval: ApprovalRecord
  version: ProposalVersion
  latestVersion: number
  staged: StagedOrder[]
  fills: Fill[]
  escalation?: Escalation
  /** The evidence a disposition acts on: the approved version's fingerprint. */
  fingerprint: string
}

export type AlertContext = { accountId?: string; accountName?: string; clientId?: string; clientName?: string }

export type AlertItem = {
  kind: 'alert'
  id: string
  title: string
  alert: ComplianceAlert
  /** The alert's supervision records: the fixtures' and the session's, in order. */
  trail: SupervisionRecord[]
  context: AlertContext
  /** Set once the session has disposed of it. */
  disposition?: AlertOutcome
  fingerprint: string
}

export type CorrespondenceItem = {
  kind: 'correspondence'
  /** The sent message's id. */
  id: string
  title: string
  threadId: string
  clientId: string
  clientName: string
  /** The message exactly as the client received it. */
  message: TextMessage
  /** The firm's send record, with its provenance (basis, editors). */
  sendAct: BindingAct
  flagged: boolean
  fingerprint: string
}

export type SupervisionItem = OrdersItem | AlertItem | CorrespondenceItem
export type SupervisionItemKind = SupervisionItem['kind']
export type DisposedItem = { item: SupervisionItem; act: BindingAct }
export type SupervisionQueue = { orders: OrdersItem[]; alerts: AlertItem[]; correspondence: CorrespondenceItem[]; disposedToday: DisposedItem[] }

export type ArchiveKind = BindingActKind | 'sent_message'
export const ARCHIVE_KINDS: readonly ArchiveKind[] = [
  'approve_proposal', 'withdraw_approval', 'send_to_party', 'sent_message', 'deliver_disclosure', 'accept_proposal', 'file_meeting_record',
  'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence',
]
export const isArchiveKind = (value: string): value is ArchiveKind => (ARCHIVE_KINDS as readonly string[]).includes(value)
export type ArchiveEntry =
  | { kind: 'act'; id: string; at: string; act: BindingAct; clientId?: string; clientName?: string; threadId?: string; threadTitle?: string }
  | { kind: 'sent_message'; id: string; at: string; message: TextMessage; actId: string; fingerprint: string; clientId: string; clientName: string; threadId: string; threadTitle: string }
export type ArchiveFilters = { clientId?: string; kind?: ArchiveKind; from?: string; to?: string }
/** The archive a viewer may read, filtered; `clients` and `dates` list what the unfiltered archive holds, for the filter controls. */
export type Archive = { entries: ArchiveEntry[]; clients: { id: string; name: string }[]; dates: string[] }

type Disposition = { fingerprint: string; rationale: string }
export type OrdersActRequest = Disposition & { kind: 'release_orders' | 'return_to_advisor' | 'escalate'; proposalId: string; approvalActId: string }
export type AlertActRequest = Disposition & { kind: 'dispose_alert'; alertId: string; outcome: AlertOutcome }
export type CorrespondenceActRequest = Disposition & { kind: 'review_correspondence'; messageId: string; outcome: CorrespondenceOutcome }
export type ComplianceActRequest = OrdersActRequest | AlertActRequest | CorrespondenceActRequest

/** An item the presenter shortcut disposes of with Mark's default disposition. */
export type PresenterItem = { kind: SupervisionItemKind; id: string }
