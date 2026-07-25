import { useQuery } from '@tanstack/react-query'
import { getRealisedSales } from '@/services/custodian'

export function useRealisedSales(accountId: string) {
  return useQuery({
    queryKey: ['realised-sales', accountId],
    queryFn: () => getRealisedSales(accountId),
    enabled: !!accountId,
  })
}
