import type { Fill } from './workspace-proposal'
import type { MeetingState, MeetingTask } from './workspace-meeting'
import type { BestInterestRecord, DisclosureDocument, OnboardingItem } from './workspace-prospect'
import type { BreakResolution } from './reference-reconciliation'
import type { ReferenceView } from './reference'

export type Role = 'advisor' | 'csa' | 'analyst' | 'compliance' | 'client' | 'prospect'
export type Person = { id: string; name: string; role: Role }
export type AgentId = 'drift-monitor' | 'pretrade-check' | 'harvest-scanner' | 'proposal' | 'client-letter' | 'meeting-prep' | 'meeting-notes' | 'prospect-profile' | 'transfer-in'
type AgentScope = { may: string[]; mayNot: string[] }
/** What an agent produces: findings in a thread, proposal versions, client-letter drafts, a meeting agenda, or meeting notes. */
type AgentOutput = 'findings' | 'proposals' | 'letters' | 'agenda' | 'notes'
export type AgentProfile = { id: AgentId; name: string; produces: AgentOutput; scope: AgentScope }
export type Visibility = 'private' | 'internal' | 'client'
export type Subject = { type: 'account' | 'household' | 'client' | 'prospect' | 'draft' | 'proposal' | 'prospect_proposal' | 'alert' | 'message' | 'meeting' | 'model' | 'recon_break'; id: string }
export type Thread = { id: string; title: string; visibility: Visibility; ownerId?: string; partyId?: string; memberIds: string[]; agentIds: AgentId[]; subject?: Subject }
/** `contracts` counts option contracts; `par` is a bond's face amount in USD. */
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'contracts' | 'par' | 'd' | 'pts' | 'count'
export type Figure = { label: string; value: number; unit: FigureUnit; source: string }   // pp and % values are fractions (0.132)
export type Citation = { source: string; asOf: string }
export type Attention = 'info' | 'attention'
export type VersionAuthor = { kind: 'agent'; agentId: AgentId } | { kind: 'person'; personId: string }
type CarriedFinding = { agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type BriefGroup = 'decide' | 'context'
/** One reading of a Brief item: a line in words with no digits and, for a decision, its key figure, formatted by the kit. */
export type BriefReading = { findingId: string; line: string; figure?: Figure }
/** A line of the Brief's summary: one finding, or the findings about one security under its name (`title`). */
export type BriefItem = { key: string; agentId: AgentId; attention: Attention; title?: string; readings: BriefReading[] }
export type TodayLine =
  /** Approved orders staged and waiting for compliance; `at` is the approval. */
  | { kind: 'release'; at: string; accountName: string; version: number; threadId: string }
  | { kind: 'meeting'; start: string; end: string; title: string; state: MeetingState; threadId: string }
  /** A prospect's first meeting, until it is recorded. Form CRS is due before it (firm policy). */
  | { kind: 'coffee'; start: string; prospectName: string; formCrs: 'due' | 'delivered'; threadId: string }
  | { kind: 'reconciliation'; openBreaks: number }
export type EmbedKind = 'drift' | 'rebalance_preview'
export type Message =
  | { kind: 'text'; id: string; threadId: string; authorId: string; at: string; body: string }
  | { kind: 'agent_finding'; id: string; threadId: string; agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention; runKey: string }
  | { kind: 'embed'; id: string; threadId: string; authorId: string; at: string; embed: EmbedKind; subject: Subject }
  | { kind: 'act'; id: string; threadId: string; at: string; actId: string }
  | { kind: 'proposal'; id: string; threadId: string; agentId: AgentId; at: string; proposalId: string }
  | { kind: 'proposal_version'; id: string; threadId: string; at: string; proposalId: string; version: number; author: VersionAuthor; changeSummary: string }
  | { kind: 'carried'; id: string; threadId: string; at: string; carriedBy: string; fromThreadId: string; findingId: string; finding: CarriedFinding }
  | { kind: 'brief_summary'; id: string; threadId: string; at: string; decide: BriefItem[]; context: BriefItem[] }
  /** The Brief's Today, composed by the engine on every read of the Brief; never stored. */
  | { kind: 'brief_today'; id: string; threadId: string; at: string; lines: TodayLine[] }
  /** The execution report for released orders, posted in the proposal's team thread after its fills. */
  | { kind: 'fills'; id: string; threadId: string; at: string; proposalId: string; title: string; version: number; releaseActId: string; fills: Fill[] }
  /** A new agenda version in the meeting thread. */
  | { kind: 'agenda_version'; id: string; threadId: string; at: string; eventId: string; version: number; author: VersionAuthor; changeSummary: string }
  /** The meeting happened: its window, in UTC, and the transcript arrived. */
  | { kind: 'meeting_held'; id: string; threadId: string; at: string; eventId: string; start: string; end: string }
  /** The Meeting Notes agent drafted the notes. */
  | { kind: 'notes_drafted'; id: string; threadId: string; at: string; eventId: string; agentId: AgentId }
  /** The follow-up tasks the filing created, as they were created. */
  | { kind: 'meeting_tasks'; id: string; threadId: string; at: string; eventId: string; filedActId: string; tasks: MeetingTask[] }
  /** A disclosure delivered to a prospect, in her thread. */
  | { kind: 'disclosure_delivered'; id: string; threadId: string; at: string; prospectId: string; document: DisclosureDocument; actId: string }
  /** A step she took: her questionnaire answered, her statements shared. */
  | { kind: 'party_step'; id: string; threadId: string; at: string; authorId: string; step: 'questionnaire' | 'statements'; summary: string }
  /** A labeled firm note about a prospect meeting that is not a Meeting record (the coffee). */
  | { kind: 'prospect_note'; id: string; threadId: string; at: string; authorId: string; prospectId: string; eventId: string; title: string; start: string; end: string; body: string }
  /** The Proposal Agent drafted a prospect proposal. */
  | { kind: 'prospect_proposal'; id: string; threadId: string; at: string; agentId: AgentId; proposalId: string; title: string }
  | { kind: 'prospect_proposal_version'; id: string; threadId: string; at: string; proposalId: string; version: number; author: VersionAuthor; changeSummary: string }
  /** Her acceptance opened onboarding: the checklist as it was opened. */
  | { kind: 'onboarding_opened'; id: string; threadId: string; at: string; prospectId: string; acceptanceActId: string; items: OnboardingItem[] }
  /** A row of a reference view quoted into a team thread: its claim, its figures with their sources, recomputed by the engine when taken. */
  | { kind: 'reference_row'; id: string; threadId: string; at: string; takenBy: string; view: ReferenceView; rowId: string; subject: Subject; claim: string; figures: Figure[]; citations: Citation[] }
/** The acts only compliance performs. */
export type ComplianceActKind = 'release_orders' | 'return_to_advisor' | 'escalate' | 'dispose_alert' | 'review_correspondence'
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'send_to_party' | 'deliver_disclosure' | 'accept_proposal' | 'file_meeting_record' | 'resolve_break' | ComplianceActKind
export type AlertOutcome = 'approve' | 'reject' | 'request_changes'
export type CorrespondenceOutcome = 'reviewed' | 'flagged'
export type PresenterPath = 'shortcut' | 'view_as' | 'scripted'
/** Firm-only: how the one presenter performed an act recorded as someone else. No path: the shortcut. */
export type ViaPresenter = { presenterId: string; path?: PresenterPath }
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
  /** The message a send_to_party act delivered. */
  messageId?: string
  /** Why compliance disposed of the item as it did; every compliance act carries one. */
  rationale?: string
  outcome?: AlertOutcome | CorrespondenceOutcome | BreakResolution
  /** The approval a release, return or escalation acted on. */
  approvalActId?: string
  viaPresenter?: ViaPresenter
  /** The disclosures this act delivered: the one a deliver_disclosure act names, or ADV 2A delivered with a proposal. */
  delivers?: DisclosureDocument[]
  /** Firm only: filed with the approval of a prospect proposal. */
  bestInterest?: BestInterestRecord
}
export type LetterBasis = { proposalId: string; version: number; fingerprint: string }
/** A recap's basis: the filing it was written from and the Intel window end it states. It is stale once either no longer matches. */
export type RecordBasis = { eventId: string; actId: string; fingerprint: string; windowEnd?: string }
export type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string; agentId?: AgentId; basis?: LetterBasis; recordBasis?: RecordBasis; figures?: Figure[]; supersedes?: string; editorIds?: string[]; stale?: boolean; staleReason?: string }
/** Who reads a thread besides the firm, as the band says it: its owner alone, the team (about these clients, by full name), or its party. */
export type ThreadAudience = { kind: 'owner' } | { kind: 'team'; about: string[] } | { kind: 'party'; name: string }
export type ThreadDetail = { thread: Thread; messages: Message[]; audience: ThreadAudience }
/** A thread as the list serves it: with its audience, so a row can say who reads it in the band's words. */
export type ListedThread = Thread & { audience: ThreadAudience }
export type Act = BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads' | 'prepare_meeting'
/** permissions: personId → the acts that person may perform, computed by the engine's can(). The UI never derives permissions itself. */
export type Directory = { people: Person[]; agents: AgentProfile[]; permissions: Record<string, Act[]> }
