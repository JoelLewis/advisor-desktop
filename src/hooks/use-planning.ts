import { useQuery } from '@tanstack/react-query'
import { getPlan, getHouseholdPlan } from '@/services/planning'

export function usePlan(clientId: string) {
  return useQuery({
    queryKey: ['plan', clientId],
    queryFn: () => getPlan(clientId),
    enabled: !!clientId,
  })
}

export function useHouseholdPlan(householdId: string) {
  return useQuery({
    queryKey: ['household-plan', householdId],
    queryFn: () => getHouseholdPlan(householdId),
    enabled: !!householdId,
  })
}
