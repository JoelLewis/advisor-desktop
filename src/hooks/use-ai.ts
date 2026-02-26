import { useQuery, useMutation } from '@tanstack/react-query'
import { sendMessage, getSuggestedPrompts, executeAction, getAIInsights } from '@/services/ai'
import type { ChatContext } from '@/types/ai'

export function useSuggestedPrompts(screenType: string) {
  return useQuery({
    queryKey: ['ai', 'suggestions', screenType],
    queryFn: () => getSuggestedPrompts(screenType),
  })
}

export function useSendMessage() {
  return useMutation({
    mutationFn: ({ message, context }: { message: string; context: ChatContext }) =>
      sendMessage(message, context),
  })
}

export function useExecuteAction() {
  return useMutation({
    mutationFn: (actionId: string) => executeAction(actionId),
  })
}

export function useAIInsights(screenType: string, entityId?: string) {
  return useQuery({
    queryKey: ['ai', 'insights', screenType, entityId],
    queryFn: () => getAIInsights(screenType, entityId),
    staleTime: 60_000,
  })
}
