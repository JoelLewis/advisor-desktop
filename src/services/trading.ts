import { get, post } from './api-client'
import type { SymbolSearchResult, ModelTradePreview } from '@/types/trading'

export function searchSymbols(q: string) {
  return get<SymbolSearchResult[]>('/oms/symbols', { q })
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
