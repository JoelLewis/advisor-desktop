import { get, post } from './api-client'
import type { NBA, NBAGroup, NBAActionTemplate, NBAEffectivenessMetrics, BatchActionRequest, BatchActionResult } from '@/types/nba'

export function getNBAs(params?: Record<string, string>) {
  return get<NBA[]>('/nba', params)
}

export function getNBAGroups() {
  return get<NBAGroup[]>('/nba/groups')
}

export function dismissNBA(id: string) {
  return post<void>(`/nba/${id}/dismiss`)
}

export function snoozeNBA(id: string, until: string) {
  return post<void>(`/nba/${id}/snooze`, { until })
}

export function getNBATemplates(id: string) {
  return get<NBAActionTemplate>(`/nba/${id}/templates`)
}

export function getNBAEffectiveness() {
  return get<NBAEffectivenessMetrics>('/nba/effectiveness')
}

export function executeBatchAction(request: BatchActionRequest) {
  return post<BatchActionResult>('/nba/batch', request)
}
