// ── Asset class discriminant ──────────────────────────────────────────

export type TradableAssetClass = 'equity' | 'option' | 'mutual_fund' | 'fixed_income' | 'digital_asset'

export const TRADABLE_ASSET_CLASSES: { value: TradableAssetClass; label: string; icon: string }[] = [
  { value: 'equity', label: 'Equities', icon: 'TrendingUp' },
  { value: 'option', label: 'Options', icon: 'Layers' },
  { value: 'mutual_fund', label: 'Mutual Funds', icon: 'PieChart' },
  { value: 'fixed_income', label: 'Fixed Income', icon: 'Landmark' },
  { value: 'digital_asset', label: 'Digital Assets', icon: 'Bitcoin' },
]

// ── Side unions (per asset class) ─────────────────────────────────────

export type EquitySide = 'buy' | 'sell' | 'sell_short' | 'buy_to_cover'
export type OptionSide = 'buy_to_open' | 'sell_to_close' | 'sell_to_open' | 'buy_to_close'
export type MutualFundAction = 'purchase' | 'redemption' | 'exchange'
export type BondSide = 'buy' | 'sell'
export type DigitalAssetSide = 'buy' | 'sell'

export type TradeSide = EquitySide | OptionSide | MutualFundAction | BondSide

// ── Order type unions ─────────────────────────────────────────────────

export type EquityOrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type OptionOrderType = 'market' | 'limit'
export type BondOrderType = 'market' | 'limit'
export type DigitalAssetOrderType = 'market' | 'limit'

export type TradeOrderType = EquityOrderType | OptionOrderType

// ── Time-in-force + bond price ────────────────────────────────────────

export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok'
export type BondPriceType = 'price' | 'yield_to_maturity' | 'yield_to_worst'
export type MutualFundAmountType = 'dollars' | 'shares'

// ── Symbol search result (widened) ────────────────────────────────────

export type SymbolSearchResult = {
  symbol: string
  name: string
  assetClass: string
  lastPrice: number
  change: number
  changePct: number
  // Option fields
  underlying?: string
  optionType?: 'call' | 'put'
  strikePrice?: number
  expirationDate?: string
  impliedVolatility?: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  openInterest?: number
  // Mutual fund fields
  nav?: number
  navDate?: string
  expenseRatio?: number
  category?: string
  minInvestment?: number
  // Fixed income fields
  cusip?: string
  couponRate?: number
  maturityDate?: string
  creditRating?: string
  yieldToMaturity?: number
  yieldToWorst?: number
  duration?: number
  parValue?: number
  issuer?: string
  bondType?: 'treasury' | 'corporate' | 'municipal' | 'agency'
  // Digital asset fields
  volume24h?: number
  marketCap?: number
  circulatingSupply?: number
  fractionalAllowed?: boolean
}

// ── Option chain types ────────────────────────────────────────────────

export type OptionQuote = {
  symbol: string
  optionType: 'call' | 'put'
  strikePrice: number
  expirationDate: string
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  impliedVolatility: number
  delta: number
  gamma: number
  theta: number
  vega: number
}

export type OptionStrike = {
  strikePrice: number
  call: OptionQuote
  put: OptionQuote
}

export type OptionExpiration = {
  expirationDate: string
  daysToExpiration: number
  strikes: OptionStrike[]
}

export type OptionChain = {
  underlying: string
  underlyingPrice: number
  expirations: OptionExpiration[]
}

// ── Model trade types (unchanged) ─────────────────────────────────────

export type ModelTradePreview = {
  accountId: string
  accountName: string
  modelId: string
  modelName: string
  currentDrift: number
  trades: ModelProposedTrade[]
  estimatedTaxImpact: number
}

export type ModelProposedTrade = {
  symbol: string
  name: string
  assetClass: string
  side: 'buy' | 'sell'
  quantity: number
  estimatedValue: number
  reason: string
}
