import { get, post } from './api-client'
import type { SymbolSearchResult, ModelTradePreview, OptionChain, TradableAssetClass } from '@/types/trading'

export function searchSymbols(q: string, assetClass?: TradableAssetClass) {
  const params: Record<string, string> = { q }
  if (assetClass) params.assetClass = assetClass
  return get<SymbolSearchResult[]>('/oms/symbols', params)
}

export function getOptionChain(underlying: string, expiration?: string) {
  const params: Record<string, string> = {}
  if (expiration) params.expiration = expiration
  return get<OptionChain>(`/oms/options/chain/${underlying}`, params)
}

export function previewModelTrades(modelId: string, accountIds: string[]) {
  return post<ModelTradePreview[]>('/oms/model-trade/preview', { modelId, accountIds })
}

export function executeModelTrades(modelId: string, accountIds: string[]) {
  return post<{ status: string; ordersCreated: number }>('/oms/model-trade/execute', {
    modelId,
    accountIds,
  })
}
