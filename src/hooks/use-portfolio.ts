import { useQuery } from '@tanstack/react-query'
import { getPositions, getDrift } from '@/services/pms'
import { useViewer } from '@/workspace/viewer/use-viewer'

export function usePositions(accountId: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['positions', viewerId, accountId],
    queryFn: () => getPositions(viewerId, accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useDrift(accountId: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['drift', viewerId, accountId],
    queryFn: () => getDrift(viewerId, accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  })
}
