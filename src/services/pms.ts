import { get } from './api-client'
import type { Position, DriftStatus } from '@/types/portfolio'

export function getPositions(accountId: string) {
  return get<Position[]>(`/pms/accounts/${accountId}/positions`)
}

export function getDrift(accountId: string) {
  return get<DriftStatus>(`/pms/accounts/${accountId}/drift`)
}
