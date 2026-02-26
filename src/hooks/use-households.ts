import { useQuery } from '@tanstack/react-query'
import { getHousehold, getHouseholds } from '@/services/crm'

export function useHouseholds() {
  return useQuery({
    queryKey: ['households'],
    queryFn: () => getHouseholds(),
  })
}

export function useHousehold(id: string) {
  return useQuery({
    queryKey: ['household', id],
    queryFn: () => getHousehold(id),
    enabled: !!id,
  })
}
