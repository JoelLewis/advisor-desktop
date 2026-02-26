import { get } from './api-client'
import type { ReconBreak, IntegrationHealth } from '@/types/reconciliation'

export function getReconStatus() {
  return get<IntegrationHealth[]>('/reconciliation/status')
}

export function getBreaks(params?: Record<string, string>) {
  return get<ReconBreak[]>('/reconciliation/breaks', params)
}

export function getIntegrationHealth() {
  return get<IntegrationHealth[]>('/reconciliation/health')
}
