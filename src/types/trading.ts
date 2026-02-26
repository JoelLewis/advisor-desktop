type SymbolSearchResult = {
  symbol: string
  name: string
  assetClass: string
  lastPrice: number
  change: number
  changePct: number
}

type ModelTradePreview = {
  accountId: string
  accountName: string
  modelId: string
  modelName: string
  currentDrift: number
  trades: ModelProposedTrade[]
  estimatedTaxImpact: number
}

type ModelProposedTrade = {
  symbol: string
  name: string
  assetClass: string
  side: 'buy' | 'sell'
  quantity: number
  estimatedValue: number
  reason: string
}

export type { SymbolSearchResult, ModelTradePreview, ModelProposedTrade }
