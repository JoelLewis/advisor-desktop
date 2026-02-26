import { get, post } from './api-client'
import type { ComplianceAlert, SupervisionRecord, TradeComplianceRequest, TradeComplianceResult } from '@/types/compliance'

export function getAlerts(params?: Record<string, string>) {
  return get<ComplianceAlert[]>('/compliance/alerts', params)
}

export function getReviewQueue() {
  return get<ComplianceAlert[]>('/compliance/review-queue')
}

export function getSupervisionRecords(alertId: string) {
  return get<SupervisionRecord[]>(`/compliance/alerts/${alertId}/records`)
}

export function checkTradeCompliance(accounts: TradeComplianceRequest[]) {
  return post<TradeComplianceResult[]>('/compliance/check-trades', { accounts })
}
