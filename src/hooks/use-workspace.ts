import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { DEFAULT_VIEWER_ID } from '@/workspace/viewer/viewer-context'
import type { AgentId } from '@/types/workspace'

export function useDirectory() {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'directory'],
    queryFn: () => api.getDirectory(viewerId),
  })
}

/**
 * Everyone the "view as" control can switch to. The control belongs to the person running the demo,
 * not to the current viewer, so it reads the directory as the advisor: a client's own directory names
 * only the people in their thread.
 */
export function useViewAsDirectory(enabled = true) {
  return useQuery({
    queryKey: ['workspace', DEFAULT_VIEWER_ID, 'directory'],
    queryFn: () => api.getDirectory(DEFAULT_VIEWER_ID),
    enabled,
  })
}

export function useThreads() {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'threads'],
    queryFn: () => api.getThreads(viewerId),
  })
}

export function useThread(id: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'thread', id],
    queryFn: () => api.getThread(viewerId, id),
  })
}

export function useDrafts(threadId: string, enabled: boolean) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'drafts', threadId],
    queryFn: () => api.getDrafts(viewerId, threadId),
    enabled,
  })
}

export function useActs(threadId: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'acts', threadId],
    queryFn: () => api.getActs(viewerId, threadId),
  })
}

/** Every query under this prefix is workspace state; a write can change what any viewer sees. */
export const WORKSPACE_QUERY_PREFIX = ['workspace'] as const

/** A write changes what every viewer sees (a sent draft reaches the client), so it marks the whole workspace stale, not just the writer's view. */
function useInvalidateWorkspace() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_PREFIX })
}

export function usePostMessage(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (body: string) => api.postMessage(viewerId, threadId, body),
    onSuccess: invalidate,
  })
}

export function useCreateDraft(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (body: string) => api.createDraft(viewerId, threadId, body),
    onSuccess: invalidate,
  })
}

export function useSendToClient() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (draftId: string) => api.sendToClient(viewerId, draftId),
    onSuccess: invalidate,
  })
}

export function useRunAgent(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (agentId: AgentId) => api.runAgent(viewerId, threadId, agentId),
    onSuccess: invalidate,
  })
}
