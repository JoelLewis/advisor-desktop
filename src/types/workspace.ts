import type { Fill } from './workspace-proposal'
import type { MeetingTask } from './workspace-meeting'

export type Role = 'advisor' | 'csa' | 'analyst' | 'compliance' | 'client'
export type Person = { id: string; name: string; role: Role }
export type AgentId = 'drift-monitor' | 'pretrade-check' | 'harvest-scanner' | 'proposal' | 'client-letter' | 'meeting-prep' | 'meeting-notes'
export type AgentScope = { may: string[]; mayNot: string[] }
/** What an agent produces: findings in a thread, proposal versions, client-letter drafts, a meeting agenda, or meeting notes. */
export type AgentOutput = 'findings' | 'proposals' | 'letters' | 'agenda' | 'notes'
export type AgentProfile = { id: AgentId; name: string; produces: AgentOutput; scope: AgentScope }
export type Visibility = 'private' | 'internal' | 'client'
export type Subject = { type: 'account' | 'household' | 'client' | 'draft' | 'proposal' | 'alert' | 'message' | 'meeting'; id: string }
export type Thread = { id: string; title: string; visibility: Visibility; ownerId?: string; clientId?: string; memberIds: string[]; agentIds: AgentId[]; subject?: Subject }
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'd'
export type Figure = { label: string; value: number; unit: FigureUnit; source: string }   // pp and % values are fractions (0.132)
export type Citation = { source: string; asOf: string }
export type Attention = 'info' | 'attention'
export type VersionAuthor = { kind: 'agent'; agentId: AgentId } | { kind: 'person'; personId: string }
export type CarriedFinding = { agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type BriefItem = { findingId: string; agentId: AgentId; claim: string; attention: Attention }
export type EmbedKind = 'drift' | 'rebalance_preview'
export type Message =
  | { kind: 'text'; id: string; threadId: string; authorId: string; at: string; body: string }
  | { kind: 'agent_finding'; id: string; threadId: string; agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention; runKey: string }
  | { kind: 'embed'; id: string; threadId: string; authorId: string; at: string; embed: EmbedKind; subject: Subject }
  | { kind: 'act'; id: string; threadId: string; at: string; actId: string }
  | { kind: 'proposal'; id: string; threadId: string; agentId: AgentId; at: string; proposalId: string }
  | { kind: 'proposal_version'; id: string; threadId: string; at: string; proposalId: string; version: number; author: VersionAuthor; changeSummary: string }
  | { kind: 'carried'; id: string; threadId: string; at: string; carriedBy: string; fromThreadId: string; findingId: string; finding: CarriedFinding }
  | { kind: 'brief_summary'; id: string; threadId: string; at: string; items: BriefItem[] }
  /** The execution report for released orders, posted in the proposal's team thread after its fills. */
  | { kind: 'fills'; id: string; threadId: string; at: string; proposalId: string; title: string; version: number; releaseActId: string; fills: Fill[] }
  /** The Brief's line for a meeting today. */
  | { kind: 'meeting_notice'; id: string; threadId: string; at: string; eventId: string; meetingThreadId: string; title: string; start: string; end: string }
  /** A new agenda version in the meeting thread. */
  | { kind: 'agenda_version'; id: string; threadId: string; at: string; eventId: string; version: number; author: VersionAuthor; changeSummary: string }
  /** The meeting happened: its window, in UTC, and the transcript arrived. */
  | { kind: 'meeting_held'; id: string; threadId: string; at: string; eventId: string; start: string; end: string }
  /** The Meeting Notes agent drafted the notes. */
  | { kind: 'notes_drafted'; id: string; threadId: string; at: string; eventId: string; agentId: AgentId }
  /** The follow-up tasks the filing created, as they were created. */
  | { kind: 'meeting_tasks'; id: string; threadId: string; at: string; eventId: string; filedActId: string; tasks: MeetingTask[] }
/** The acts only compliance performs. */
export type ComplianceActKind = 'release_orders' | 'return_to_advisor' | 'escalate' | 'dispose_alert' | 'review_correspondence'
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'send_to_client' | 'file_meeting_record' | ComplianceActKind
export type AlertOutcome = 'approve' | 'reject' | 'request_changes'
export type CorrespondenceOutcome = 'reviewed' | 'flagged'
/** Firm-only: the act was recorded through the presenter's "Demo · act as Mark Davis" shortcut, by this presenter. */
export type ViaPresenter = { presenterId: string }
export type BindingAct = {
  id: string
  kind: BindingActKind
  actorId: string
  at: string
  /** Where the act's record slip is posted. An alert disposition and a correspondence review are recorded outside any thread. */
  threadId?: string
  subject?: Subject
  version?: number
  fingerprint: string
  summary: string
  basis?: LetterBasis
  /** The filed meeting record a sent recap came from. */
  recordBasis?: RecordBasis
  editedBy?: string[]
  /** The message a send_to_client act delivered. */
  messageId?: string
  /** Why compliance disposed of the item as it did; every compliance act carries one. */
  rationale?: string
  outcome?: AlertOutcome | CorrespondenceOutcome
  /** The approval a release, return or escalation acted on. */
  approvalActId?: string
  viaPresenter?: ViaPresenter
}
export type LetterBasis = { proposalId: string; version: number; fingerprint: string }
/** A recap's basis: the filing it was written from and the Intel window end it states. It is stale once either no longer matches. */
export type RecordBasis = { eventId: string; actId: string; fingerprint: string; windowEnd?: string }
export type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string; agentId?: AgentId; basis?: LetterBasis; recordBasis?: RecordBasis; figures?: Figure[]; supersedes?: string; editorIds?: string[]; stale?: boolean; staleReason?: string }
export type ThreadDetail = { thread: Thread; messages: Message[] }
export type Act = BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads' | 'prepare_meeting'
/** permissions: personId → the acts that person may perform, computed by the engine's can(). The UI never derives permissions itself. */
export type Directory = { people: Person[]; agents: AgentProfile[]; permissions: Record<string, Act[]> }
