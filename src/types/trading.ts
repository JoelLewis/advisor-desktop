
// ── Asset class discriminant ──────────────────────────────────────────

export type TradableAssetClass = 'equity' | 'option' | 'mutual_fund' | 'fixed_income' | 'digital_asset'

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

