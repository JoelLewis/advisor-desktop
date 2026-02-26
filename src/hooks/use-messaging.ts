import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getThreads, getMessages, sendMessage, createThread } from '@/services/messaging'
import type { MessageAttachment, Thread } from '@/types/messaging'

export function useThreads() {
  return useQuery({
    queryKey: ['messaging', 'threads'],
    queryFn: getThreads,
  })
}

export function useMessages(threadId: string) {
  return useQuery({
    queryKey: ['messaging', 'messages', threadId],
    queryFn: () => getMessages(threadId),
    enabled: !!threadId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      threadId,
      content,
      attachments,
    }: {
      threadId: string
      content: string
      attachments?: MessageAttachment[]
    }) => sendMessage(threadId, content, attachments),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', variables.threadId] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] })
    },
  })
}

export function useCreateThread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      subject,
      participantIds,
      entityContext,
    }: {
      subject: string
      participantIds: string[]
      entityContext?: Thread['entityContext']
    }) => createThread(subject, participantIds, entityContext),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] })
    },
  })
}
