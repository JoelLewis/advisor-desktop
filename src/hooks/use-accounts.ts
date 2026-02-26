import { useQuery } from '@tanstack/react-query'
import { getAccount, getAccounts } from '@/services/custodian'

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccount(id),
    enabled: !!id,
  })
}

export function useAccounts(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => getAccounts(params),
    enabled: !!params,
  })
}
