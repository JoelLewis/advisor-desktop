import { useQuery } from '@tanstack/react-query'
import { getTaxLots } from '@/services/custodian'

export function useTaxLots(accountId: string) {
  return useQuery({
    queryKey: ['tax-lots', accountId],
    queryFn: () => getTaxLots(accountId),
    enabled: !!accountId,
  })
}
