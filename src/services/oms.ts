import { get, post } from './api-client'
import type { TradableAssetClass, TradeSide, TradeOrderType, TimeInForce, BondPriceType, MutualFundAmountType } from '@/types/trading'
import type { CurrencyCode } from '@/types/currency'

export type Order = {
  id: string
  accountId: string
  symbol: string
  side: string
  quantity: number
  orderType: string
  limitPrice?: number
  stopPrice?: number
  status: 'pending' | 'submitted' | 'filled' | 'cancelled'
  filledQuantity: number
  filledPrice?: number
  submittedAt: string
  filledAt?: string
  assetClass?: TradableAssetClass
  timeInForce?: TimeInForce
  extendedHours?: boolean
  // Option fields
  underlying?: string
  optionType?: 'call' | 'put'
  strikePrice?: number
  expirationDate?: string
  contractMultiplier?: number
  // Mutual fund fields
  amountType?: MutualFundAmountType
  dollarAmount?: number
  exchangeTargetSymbol?: string
  // Fixed income fields
  parAmount?: number
  bondPriceType?: BondPriceType
  priceOrYield?: number
  // Digital asset
  fractionalQuantity?: boolean
  // Computed
  estimatedValue?: number
  commission?: number
}

export type TradeRequest = {
  accountId: string
  symbol: string
  side: TradeSide | string
  quantity: number
  orderType: TradeOrderType | string
  limitPrice?: number
  stopPrice?: number
  assetClass?: TradableAssetClass
  timeInForce?: TimeInForce
  extendedHours?: boolean
  // Option fields
  underlying?: string
  optionType?: 'call' | 'put'
  strikePrice?: number
  expirationDate?: string
  contractMultiplier?: number
  // Mutual fund fields
  amountType?: MutualFundAmountType
  dollarAmount?: number
  exchangeTargetSymbol?: string
  // Fixed income fields
  parAmount?: number
  bondPriceType?: BondPriceType
  priceOrYield?: number
  // Digital asset
  fractionalQuantity?: boolean
  estimatedValue?: number
  commission?: number
}

export type RebalanceRequest = {
  accountIds: string[]
  driftThreshold: number
  taxAware: boolean
}

export type RebalancePreview = {
  accountId: string
  // §9.3 · currencies-and-fx — the account's own base currency (`accounts.ts`'s `baseCurrency`,
  // defaulting to USD). Every trade in `trades` carries the same tag, and every notional on this
  // preview (`estimatedTaxImpact`, each trade's `estimatedValue`/`taxImpact`) is denominated in it,
  // not USD — `oms.ts`'s trade generator derives everything from `account.totalValue`, which is
  // native currency. A consumer must convert before summing across previews of different accounts.
  currency: CurrencyCode
  trades: ProposedTrade[]
  estimatedTaxImpact: number
}

export type ProposedTrade = {
  symbol: string
  name: string
  side: 'buy' | 'sell'
  quantity: number
  estimatedValue: number
  taxImpact: number
  washSaleRisk: boolean
  // Same account-native currency as the parent `RebalancePreview.currency` — carried on the trade
  // itself so a consumer that only has the trade (not the preview) still knows what it's reading.
  currency: CurrencyCode
}

export type RebalanceExecution = {
  accountId: string
  status: 'submitted' | 'completed' | 'failed'
  ordersCreated: number
  estimatedCompletion: string
}

export function submitTrade(request: TradeRequest) {
  return post<Order>('/oms/orders', request)
}

export function getOrders(params?: Record<string, string>) {
  return get<Order[]>('/oms/orders', params)
}

/**
 * Preview a rebalance without executing it. `submitRebalance` is the same request — one
 * endpoint, one function underneath both names.
 */
export function previewRebalance(request: { accountIds: string[]; taxAware: boolean; driftThreshold?: number }) {
  return post<RebalancePreview[]>('/oms/rebalance', request)
}

export function submitRebalance(request: RebalanceRequest) {
  return previewRebalance(request)
}

export function getExecutionStatus(orderId: string) {
  return get<Order>(`/oms/orders/${orderId}`)
}

export function executeRebalance(request: { accountIds: string[]; taxAware: boolean }) {
  return post<RebalanceExecution[]>('/oms/rebalance/execute', request)
}

// Pre-trade compliance

export type PreTradeViolation = {
  constraint: string
  severity: 'block' | 'warning'
  currentValue: string
  limit: string
  message: string
}

export type PreTradeCheckResult = {
  passed: boolean
  violations: PreTradeViolation[]
}

export type PreTradeCheckRequest = {
  accountId: string
  symbol: string
  side: string
  quantity: number
  // C28 · pre-trade-compliance — required, not inferred. A missing notional previously fell back
  // to `quantity * 100`, making concentration limits evadable by trading high-priced securities.
  estimatedValue: number
}

export function preTradeCheck(request: PreTradeCheckRequest) {
  return post<PreTradeCheckResult>('/oms/orders/pre-check', request)
}
