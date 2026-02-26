import { useQuery } from '@tanstack/react-query'
import { getClients, getClient } from '@/services/crm'

export function useClients(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => getClients(params),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id),
    enabled: !!id,
  })
}
