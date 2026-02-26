import { useQuery } from '@tanstack/react-query'
import { getClientDocuments } from '@/services/documents'

export function useClientDocuments(clientId: string) {
  return useQuery({
    queryKey: ['documents', clientId],
    queryFn: () => getClientDocuments(clientId),
    enabled: !!clientId,
  })
}
