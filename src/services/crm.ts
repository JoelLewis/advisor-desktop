import { get } from './api-client'
import type { Household } from '@/types/household'
import type { HeldAwayAsset } from '@/types/held-away'

export function getHousehold(id: string) {
  return get<Household>(`/crm/households/${id}`)
}

export function getHeldAway(householdId: string) {
  return get<HeldAwayAsset[]>(`/crm/households/${householdId}/held-away`)
}
