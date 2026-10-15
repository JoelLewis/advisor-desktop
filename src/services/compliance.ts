import { get } from './api-client'
import type { ComplianceAlert, SupervisionRecord } from '@/types/compliance'

/** Compliance alerts and their records are the firm's: each read names its viewer, and an outsider is told they do not exist. */
const as = (viewer: string) => ({ 'X-Viewer': viewer })

export function getAlerts(viewer: string, params?: Record<string, string>) {
  return get<ComplianceAlert[]>('/compliance/alerts', params, as(viewer))
}

export function getSupervisionRecords(viewer: string, alertId: string) {
  return get<SupervisionRecord[]>(`/compliance/alerts/${alertId}/records`, undefined, as(viewer))
}
