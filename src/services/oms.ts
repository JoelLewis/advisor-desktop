import { get, post } from './api-client'

export type Order = {
  id: string
  accountId: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  orderType: 'market' | 'limit'
  limitPrice?: number
  status: 'pending' | 'submitted' | 'filled' | 'cancelled'
  filledQuantity: number
  filledPrice?: number
  submittedAt: string
  filledAt?: string
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

export type TradeRequest = {
  accountId: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  orderType: 'market' | 'limit'
  limitPrice?: number
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

export type RebalanceExecution = {
  accountId: string
  status: 'submitted' | 'completed' | 'failed'
  ordersCreated: number
  estimatedCompletion: string
}

export function executeRebalance(request: { accountIds: string[]; taxAware: boolean }) {
  return post<RebalanceExecution[]>('/oms/rebalance/execute', request)
}
