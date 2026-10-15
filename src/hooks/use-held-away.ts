import { useQuery } from '@tanstack/react-query'
import { getHeldAway } from '@/services/crm'
import { useViewer } from '@/workspace/viewer/use-viewer'

export function useHeldAway(householdId: string) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['held-away', viewerId, householdId],
    queryFn: () => getHeldAway(viewerId, householdId),
    enabled: !!householdId,
  })
}
