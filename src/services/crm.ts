import { get } from './api-client'
import type { Household } from '@/types/household'
import type { HeldAwayAsset } from '@/types/held-away'

/** The CRM's records are the firm's: each read names its viewer, and an outsider is told they do not exist. */
const as = (viewer: string) => ({ 'X-Viewer': viewer })

export function getHousehold(viewer: string, id: string) {
  return get<Household>(`/crm/households/${id}`, undefined, as(viewer))
}

export function getHeldAway(viewer: string, householdId: string) {
  return get<HeldAwayAsset[]>(`/crm/households/${householdId}/held-away`, undefined, as(viewer))
}
