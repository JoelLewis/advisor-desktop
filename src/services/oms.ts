import { get, post } from './api-client'
import type { TradableAssetClass, TradeSide, TradeOrderType, TimeInForce, BondPriceType, MutualFundAmountType } from '@/types/trading'

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
  trades: ProposedTrade[]
  estimatedTaxImpact: number
  complianceChecks: ComplianceCheck[]
}

export type ProposedTrade = {
  symbol: string
  name: string
  side: 'buy' | 'sell'
  quantity: number
  estimatedValue: number
  taxImpact: number
  washSaleRisk: boolean
}

export type ComplianceCheck = {
  rule: string
  status: 'pass' | 'warning' | 'fail'
  message: string
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

export function submitRebalance(request: RebalanceRequest) {
  return post<RebalancePreview[]>('/oms/rebalance', request)
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
  estimatedValue?: number
}

export function preTradeCheck(request: PreTradeCheckRequest) {
  return post<PreTradeCheckResult>('/oms/orders/pre-check', request)
}
