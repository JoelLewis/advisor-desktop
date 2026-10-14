import { useQuery } from '@tanstack/react-query'
import { getPositions, getDrift } from '@/services/pms'

export function usePositions(accountId: string) {
  return useQuery({
    queryKey: ['positions', accountId],
    queryFn: () => getPositions(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useDrift(accountId: string) {
  return useQuery({
    queryKey: ['drift', accountId],
    queryFn: () => getDrift(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  })
}
