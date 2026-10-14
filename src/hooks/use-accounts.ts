import { useQuery } from '@tanstack/react-query'
import { getAccount, getTaxLots } from '@/services/custodian'
import { useViewer } from '@/workspace/viewer/use-viewer'

export function useAccount(id: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['account', viewerId, id],
    queryFn: () => getAccount(viewerId, id),
    enabled: !!id,
  })
}

export function useTaxLots(accountId: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['tax-lots', viewerId, accountId],
    queryFn: () => getTaxLots(viewerId, accountId),
    enabled: !!accountId,
  })
}
