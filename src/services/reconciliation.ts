import { get, post } from './api-client'
import type { ReconBreak, IntegrationHealth, DataQualitySummary } from '@/types/reconciliation'

export function getReconStatus() {
  return get<IntegrationHealth[]>('/reconciliation/status')
}

export function getBreaks(params?: Record<string, string>) {
  return get<ReconBreak[]>('/reconciliation/breaks', params)
}

export function getIntegrationHealth() {
  return get<IntegrationHealth[]>('/reconciliation/health')
}

export function getDataQualitySummary() {
  return get<DataQualitySummary>('/reconciliation/summary')
}

export type ReconTrendingPoint = {
  date: string
  positionMatchRate: number
  cashMatchRate: number
  transactionMatchRate: number
  openBreaks: number
}

export function getReconTrending() {
  return get<ReconTrendingPoint[]>('/reconciliation/trending')
}

export function resolveBreak(breakId: string) {
  return post<ReconBreak>(`/reconciliation/breaks/${breakId}/resolve`, {})
}
