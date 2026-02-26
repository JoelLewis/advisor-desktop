import { useQuery } from '@tanstack/react-query'
import { get } from '@/services/api-client'
import type { HeldAwayAsset } from '@/types/held-away'

export function useHeldAway(householdId: string) {
  return useQuery({
    queryKey: ['held-away', householdId],
    queryFn: () => get<HeldAwayAsset[]>(`/crm/households/${householdId}/held-away`),
    enabled: !!householdId,
  })
}
