import { useQuery } from '@tanstack/react-query'
import { getClientActivities } from '@/services/crm'

export function useClientActivities(clientId: string) {
  return useQuery({
    queryKey: ['client-activities', clientId],
    queryFn: () => getClientActivities(clientId),
    enabled: !!clientId,
  })
}
