import { useQuery } from '@tanstack/react-query'
import { getHousehold } from '@/services/crm'
import { useViewer } from '@/workspace/viewer/use-viewer'

export function useHousehold(id: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['household', viewerId, id],
    queryFn: () => getHousehold(viewerId, id),
    enabled: !!id,
  })
}
