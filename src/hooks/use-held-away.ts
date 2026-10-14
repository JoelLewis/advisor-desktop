import { useQuery } from '@tanstack/react-query'
import { getHeldAway } from '@/services/crm'

export function useHeldAway(householdId: string) {
  return useQuery({
    queryKey: ['held-away', householdId],
    queryFn: () => getHeldAway(householdId),
    enabled: !!householdId,
  })
}
