import { useQuery } from '@tanstack/react-query'
import { getAccount, getTaxLots } from '@/services/custodian'

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccount(id),
    enabled: !!id,
  })
}

export function useTaxLots(accountId: string) {
  return useQuery({
    queryKey: ['tax-lots', accountId],
    queryFn: () => getTaxLots(accountId),
    enabled: !!accountId,
  })
}
