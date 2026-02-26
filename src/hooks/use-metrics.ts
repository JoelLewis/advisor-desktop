import { useQuery } from '@tanstack/react-query'
import { getMetricsSummary } from '@/services/pms'

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: getMetricsSummary,
  })
}
