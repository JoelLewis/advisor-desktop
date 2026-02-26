import { useQuery } from '@tanstack/react-query'
import { getClientCommunications } from '@/services/crm'

export function useClientComms(clientId?: string) {
  return useQuery({
    queryKey: ['crm', 'communications', clientId],
    queryFn: () => getClientCommunications(clientId!),
    enabled: !!clientId,
  })
}
