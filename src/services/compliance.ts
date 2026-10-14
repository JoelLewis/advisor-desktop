import { get } from './api-client'
import type { ComplianceAlert, SupervisionRecord } from '@/types/compliance'

export function getAlerts(params?: Record<string, string>) {
  return get<ComplianceAlert[]>('/compliance/alerts', params)
}

export function getSupervisionRecords(alertId: string) {
  return get<SupervisionRecord[]>(`/compliance/alerts/${alertId}/records`)
}
