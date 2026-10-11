import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { AgentId } from '@/types/workspace'

export function useDirectory() {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'directory'],
    queryFn: () => api.getDirectory(viewerId),
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

function useInvalidateViewer() {
  const { viewerId } = useViewer()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['workspace', viewerId] })
}

export function usePostMessage(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateViewer()
  return useMutation({
    mutationFn: (body: string) => api.postMessage(viewerId, threadId, body),
    onSuccess: invalidate,
  })
}

export function useCreateDraft(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateViewer()
  return useMutation({
    mutationFn: (body: string) => api.createDraft(viewerId, threadId, body),
    onSuccess: invalidate,
  })
}

export function useSendToClient(_threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateViewer()
  return useMutation({
    mutationFn: (draftId: string) => api.sendToClient(viewerId, draftId),
    onSuccess: invalidate,
  })
}

export function useRunAgent(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateViewer()
  return useMutation({
    mutationFn: (agentId: AgentId) => api.runAgent(viewerId, threadId, agentId),
    onSuccess: invalidate,
  })
}
