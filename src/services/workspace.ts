import { get, post, put } from './api-client'
import type { AgentId, BindingAct, Directory, ServedAct, Draft, ListedThread, Message, ThreadDetail } from '@/types/workspace'
import type { Archive, ArchiveFilters, ComplianceActRequest, PresenterItem, SupervisionQueue } from '@/types/workspace-supervision'
import type { DraftPreview, LegEdit, ProposalConstraint, ProposalDetail } from '@/types/workspace-proposal'
import type { AgendaItemInput, MeetingSummary, MeetingView, NoteLineInput } from '@/types/workspace-meeting'
import type { ClientView, HouseholdView } from '@/types/workspace-household'
import type {
  DisclosureDocument, PartySteps, ProspectConstraint, ProspectProposalDetail, ProspectStepName, ProspectSummary, ProspectView, StepOutcome,
} from '@/types/workspace-prospect'
import type { StoryProgress } from '@/types/workspace-story'
import type { SuitabilityReason } from '@/lib/suitability'

const as = (viewer: string) => ({ 'X-Viewer': viewer })

export const getDirectory = (viewer: string) =>
  get<Directory>('/workspace/people', undefined, as(viewer))
export const getThreads = (viewer: string) =>
  get<ListedThread[]>('/workspace/threads', undefined, as(viewer))
export const getThread = (viewer: string, id: string) =>
  get<ThreadDetail>(`/workspace/threads/${id}`, undefined, as(viewer))
export const postMessage = (viewer: string, threadId: string, body: string) =>
  post<Message>(`/workspace/threads/${threadId}/messages`, { body }, as(viewer))
export const getDrafts = (viewer: string, threadId: string) =>
  get<Draft[]>(`/workspace/threads/${threadId}/drafts`, undefined, as(viewer))
export const createDraft = (viewer: string, threadId: string, body: string) =>
  post<Draft>(`/workspace/threads/${threadId}/drafts`, { body }, as(viewer))
export const getActs = (viewer: string, threadId: string) =>
  get<ServedAct[]>('/workspace/acts', { threadId }, as(viewer))
export const sendToParty = (viewer: string, draftId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'send_to_party', draftId }, as(viewer))
export const runAgent = (viewer: string, threadId: string, agentId: AgentId) =>
  post<Message[]>(`/workspace/threads/${threadId}/agents/${agentId}/run`, undefined, as(viewer))
/** Read-only: what the agent would find on this thread, without posting anything. */
export const previewAgent = (viewer: string, threadId: string, agentId: AgentId) =>
  get<Message[]>(`/workspace/threads/${threadId}/agents/${agentId}/preview`, undefined, as(viewer))

export const getProposals = (viewer: string, threadId?: string) =>
  get<ProposalDetail[]>('/workspace/proposals', threadId ? { threadId } : undefined, as(viewer))
export const getProposal = (viewer: string, id: string) =>
  get<ProposalDetail>(`/workspace/proposals/${id}`, undefined, as(viewer))
export const createProposal = (viewer: string, threadId: string, accountId: string) =>
  post<ProposalDetail>('/workspace/proposals', { threadId, accountId }, as(viewer))
export const reviseProposal = (viewer: string, id: string, constraints: ProposalConstraint[]) =>
  post<ProposalDetail>(`/workspace/proposals/${id}/revise`, { constraints }, as(viewer))
export const saveProposalVersion = (viewer: string, id: string, edits: LegEdit[]) =>
  post<ProposalDetail>(`/workspace/proposals/${id}/versions`, { edits }, as(viewer))
/** Read-only: what the edits would make of the latest version, saved nowhere. */
export const previewProposalEdits = (viewer: string, id: string, edits: LegEdit[]) =>
  post<DraftPreview>(`/workspace/proposals/${id}/preview`, { edits }, as(viewer))
export const approveProposal = (viewer: string, proposalId: string, version: number, fingerprint: string, suitability?: SuitabilityReason) =>
  post<BindingAct>('/workspace/acts', { kind: 'approve_proposal', proposalId, version, fingerprint, ...(suitability ? { suitability } : {}) }, as(viewer))
export const withdrawApproval = (viewer: string, proposalId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'withdraw_approval', proposalId }, as(viewer))
export const carryFinding = (viewer: string, fromThreadId: string, messageId: string, toThreadId: string) =>
  post<Message>(`/workspace/threads/${fromThreadId}/findings/${messageId}/carry`, { toThreadId }, as(viewer))
export const draftLetter = (viewer: string, clientThreadId: string, proposalId: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/letter`, { proposalId }, as(viewer))
export const reviseDraft = (viewer: string, clientThreadId: string, draftId: string, body: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/${draftId}/revisions`, { body }, as(viewer))

export const recordComplianceAct = (viewer: string, request: ComplianceActRequest) =>
  post<BindingAct>('/workspace/acts', request, as(viewer))
export const getSupervision = (viewer: string) =>
  get<SupervisionQueue>('/workspace/supervision', undefined, as(viewer))
/** Only the filters that are set travel as query parameters. */
export const getArchive = (viewer: string, filters: ArchiveFilters) =>
  get<Archive>('/workspace/archive', Object.fromEntries(Object.entries(filters).filter((e): e is [string, string] => typeof e[1] === 'string')), as(viewer))
/** The presenter shortcut: Mark's default disposition, recorded as Mark with the shortcut marked. */
export const actAsCco = (viewer: string, item: PresenterItem) =>
  post<BindingAct>('/workspace/presenter/act-as-cco', { item }, as(viewer))

export const getMeetings = (viewer: string) =>
  get<MeetingSummary[]>('/workspace/meetings', undefined, as(viewer))
export const getMeeting = (viewer: string, eventId: string) =>
  get<MeetingView>(`/workspace/meetings/${eventId}`, undefined, as(viewer))
export const runMeetingPrep = (viewer: string, eventId: string) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/prep`, undefined, as(viewer))
export const reviseAgenda = (viewer: string, eventId: string, items: AgendaItemInput[]) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/agenda`, { items }, as(viewer))
export const holdMeeting = (viewer: string, eventId: string) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/hold`, undefined, as(viewer))
export const draftMeetingNotes = (viewer: string, eventId: string) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/notes/draft`, undefined, as(viewer))
export const saveMeetingNotes = (viewer: string, eventId: string, lines: NoteLineInput[]) =>
  put<MeetingView>(`/workspace/meetings/${eventId}/notes`, { lines }, as(viewer))
export const fileMeetingRecord = (viewer: string, eventId: string, fingerprint: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'file_meeting_record', eventId, fingerprint }, as(viewer))
export const draftRecap = (viewer: string, clientThreadId: string, eventId: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/recap`, { eventId }, as(viewer))
export const getHousehold = (viewer: string, householdId: string) =>
  get<HouseholdView>(`/workspace/households/${householdId}`, undefined, as(viewer))
export const getClientView = (viewer: string, clientId: string) =>
  get<ClientView>(`/workspace/clients/${clientId}`, undefined, as(viewer))

export const getProspects = (viewer: string) =>
  get<ProspectSummary[]>('/workspace/prospects', undefined, as(viewer))
export const getProspect = (viewer: string, id: string) =>
  get<ProspectView>(`/workspace/prospects/${id}`, undefined, as(viewer))
export const getPartySteps = (viewer: string, id: string) =>
  get<PartySteps>(`/workspace/prospects/${id}/steps`, undefined, as(viewer))
export const recordCoffee = (viewer: string, id: string, body: string) =>
  post<Message>(`/workspace/prospects/${id}/coffee`, { body }, as(viewer))
export const advanceProspect = (viewer: string, id: string, to: 'reply' | 'acceptance') =>
  post<StepOutcome>(`/workspace/prospects/${id}/advance`, { to }, as(viewer))
/** One of her own steps, taken as her (View as): her scripted answers, her statements, or acceptance of the version sent to her. */
export const takeHerStep = (viewer: string, id: string, step: ProspectStepName) =>
  post<StepOutcome>(`/workspace/prospects/${id}/${step}`, {}, as(viewer))
/** The presenter shortcut: her step, recorded as her with the shortcut marked. */
export const actAsProspect = (viewer: string, prospectId: string, step: ProspectStepName) =>
  post<StepOutcome>('/workspace/presenter/act-as-prospect', { prospectId, step }, as(viewer))
export const getProspectProposals = (viewer: string, id: string) =>
  get<ProspectProposalDetail[]>(`/workspace/prospects/${id}/proposals`, undefined, as(viewer))
export const createProspectProposal = (viewer: string, id: string) =>
  post<ProspectProposalDetail>(`/workspace/prospects/${id}/proposals`, {}, as(viewer))
export const reviseProspectProposal = (viewer: string, id: string, proposalId: string, constraints: ProspectConstraint[]) =>
  post<ProspectProposalDetail>(`/workspace/prospects/${id}/proposals/${proposalId}/revise`, { constraints }, as(viewer))
export const deliverDisclosure = (viewer: string, prospectId: string, document: DisclosureDocument) =>
  post<BindingAct>('/workspace/acts', { kind: 'deliver_disclosure', prospectId, document }, as(viewer))
export const approveProspectProposal = (viewer: string, proposalId: string, version: number, fingerprint: string, rationale: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'approve_proposal', proposalId, version, fingerprint, rationale }, as(viewer))
export const sendProspectProposal = (viewer: string, proposalId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'send_to_party', proposalId }, as(viewer))

export const getStoryProgress = (viewer: string) =>
  get<StoryProgress>('/workspace/story', undefined, as(viewer))
