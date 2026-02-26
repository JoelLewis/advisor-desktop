import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeBatchAction } from '@/services/nba'
import type { BatchActionRequest } from '@/types/nba'

export function useBatchAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: BatchActionRequest) => executeBatchAction(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nbas'] }),
  })
}
