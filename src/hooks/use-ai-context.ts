import { useQuery } from '@tanstack/react-query'
import { getContextBriefing } from '@/services/ai'

export function useAIContext(screenType: string, entityId?: string) {
  return useQuery({
    queryKey: ['ai-context', screenType, entityId],
    queryFn: () => getContextBriefing(screenType, entityId),
    enabled: !!screenType,
    staleTime: 30_000,
  })
}
