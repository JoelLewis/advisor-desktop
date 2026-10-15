import { get } from './api-client'
import type { Position, DriftStatus } from '@/types/portfolio'

/** Positions and drift are the firm's records: each read names its viewer, and an outsider is told they do not exist. */
const as = (viewer: string) => ({ 'X-Viewer': viewer })

export function getPositions(viewer: string, accountId: string) {
  return get<Position[]>(`/pms/accounts/${accountId}/positions`, undefined, as(viewer))
}

export function getDrift(viewer: string, accountId: string) {
  return get<DriftStatus>(`/pms/accounts/${accountId}/drift`, undefined, as(viewer))
}
