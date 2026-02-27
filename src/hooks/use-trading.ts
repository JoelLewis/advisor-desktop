import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchSymbols, getOptionChain, previewModelTrades, executeModelTrades } from '@/services/trading'
import type { TradableAssetClass } from '@/types/trading'

export function useSymbolSearch(q: string, assetClass?: TradableAssetClass) {
  return useQuery({
    queryKey: ['symbols', q, assetClass],
    queryFn: () => searchSymbols(q, assetClass),
    enabled: q.length >= 1,
  })
}

export function useOptionChain(underlying: string, expiration?: string) {
  return useQuery({
    queryKey: ['optionChain', underlying, expiration],
    queryFn: () => getOptionChain(underlying, expiration),
    enabled: underlying.length >= 1,
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
