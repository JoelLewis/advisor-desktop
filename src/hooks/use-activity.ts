import { useQuery } from '@tanstack/react-query'
import { getActivities } from '@/services/crm'

export function useActivity(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['activity', params],
    queryFn: () => getActivities(params),
  })
}
