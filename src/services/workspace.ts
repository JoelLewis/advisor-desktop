import { get, post } from './api-client'
import type { AgentId, BindingAct, Directory, Draft, Message, Thread, ThreadDetail } from '@/types/workspace'
import type { DraftPreview, LegEdit, ProposalConstraint, ProposalDetail } from '@/types/workspace-proposal'

const as = (viewer: string) => ({ 'X-Viewer': viewer })

export const getDirectory = (viewer: string) =>
  get<Directory>('/workspace/people', undefined, as(viewer))
export const getThreads = (viewer: string) =>
  get<Thread[]>('/workspace/threads', undefined, as(viewer))
export const getThread = (viewer: string, id: string) =>
  get<ThreadDetail>(`/workspace/threads/${id}`, undefined, as(viewer))
export const postMessage = (viewer: string, threadId: string, body: string) =>
  post<Message>(`/workspace/threads/${threadId}/messages`, { body }, as(viewer))
export const getDrafts = (viewer: string, threadId: string) =>
  get<Draft[]>(`/workspace/threads/${threadId}/drafts`, undefined, as(viewer))
export const createDraft = (viewer: string, threadId: string, body: string) =>
  post<Draft>(`/workspace/threads/${threadId}/drafts`, { body }, as(viewer))
export const getActs = (viewer: string, threadId: string) =>
  get<BindingAct[]>('/workspace/acts', { threadId }, as(viewer))
export const sendToClient = (viewer: string, draftId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'send_to_client', draftId }, as(viewer))
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
export const approveProposal = (viewer: string, proposalId: string, version: number, fingerprint: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'approve_proposal', proposalId, version, fingerprint }, as(viewer))
export const withdrawApproval = (viewer: string, proposalId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'withdraw_approval', proposalId }, as(viewer))
export const carryFinding = (viewer: string, fromThreadId: string, messageId: string, toThreadId: string) =>
  post<Message>(`/workspace/threads/${fromThreadId}/findings/${messageId}/carry`, { toThreadId }, as(viewer))
export const draftLetter = (viewer: string, clientThreadId: string, proposalId: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/letter`, { proposalId }, as(viewer))
export const reviseDraft = (viewer: string, clientThreadId: string, draftId: string, body: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/${draftId}/revisions`, { body }, as(viewer))
