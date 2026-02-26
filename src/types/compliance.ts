export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'flagged' | 'escalated'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type ComplianceAlert = {
  id: string
  type: string
  severity: AlertSeverity
  title: string
  description: string
  entityType: 'client' | 'account' | 'trade' | 'document'
  entityId: string
  reviewStatus: ReviewStatus
  createdAt: string
  resolvedAt?: string
}

export type SupervisionRecord = {
  id: string
  alertId: string
  reviewer: string
  action: string
  notes: string
  timestamp: string
}

export type TradeComplianceRequest = {
  accountId: string
  trades: {
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    estimatedValue: number
  }[]
}

export type TradeComplianceResult = {
  accountId: string
  checks: TradeComplianceCheck[]
  overallStatus: 'pass' | 'warning' | 'fail'
}

export type TradeComplianceCheck = {
  rule: string
  category: 'restricted_securities' | 'concentration_limit' | 'cash_minimum' | 'wash_sale' | 'position_limit'
  status: 'pass' | 'warning' | 'fail'
  message: string
  details?: {
    symbol?: string
    currentWeight?: number
    postTradeWeight?: number
    limit?: number
    cashBalance?: number
    minimumCash?: number
  }
}
