import { get, post } from './api-client'
import type { AgentId, BindingAct, Directory, Draft, Message, Thread, ThreadDetail } from '@/types/workspace'

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
