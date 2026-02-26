import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchSymbols, previewModelTrades, executeModelTrades } from '@/services/trading'

export function useSymbolSearch(q: string) {
  return useQuery({
    queryKey: ['symbols', q],
    queryFn: () => searchSymbols(q),
    enabled: q.length >= 1,
  })
}

export function useModelTradePreview() {
  return useMutation({
    mutationFn: ({ modelId, accountIds }: { modelId: string; accountIds: string[] }) =>
      previewModelTrades(modelId, accountIds),
  })
}

export function useExecuteModelTrades() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, accountIds }: { modelId: string; accountIds: string[] }) =>
      executeModelTrades(modelId, accountIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
