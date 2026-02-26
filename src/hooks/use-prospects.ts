import { useQuery } from '@tanstack/react-query'
import { getProspects, getProspect } from '@/services/prospects'

export function useProspects(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['prospects', params],
    queryFn: () => getProspects(params),
  })
}

export function useProspect(id: string) {
  return useQuery({
    queryKey: ['prospect', id],
    queryFn: () => getProspect(id),
    enabled: !!id,
  })
}
