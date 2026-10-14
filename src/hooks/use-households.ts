import { useQuery } from '@tanstack/react-query'
import { getHousehold } from '@/services/crm'

export function useHousehold(id: string) {
  return useQuery({
    queryKey: ['household', id],
    queryFn: () => getHousehold(id),
    enabled: !!id,
  })
}
