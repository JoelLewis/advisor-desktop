import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientNotes, createNote } from '@/services/notes'

export function useClientNotes(clientId: string) {
  return useQuery({
    queryKey: ['notes', clientId],
    queryFn: () => getClientNotes(clientId),
    enabled: !!clientId,
  })
}

export function useCreateNote(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => createNote(clientId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', clientId] })
    },
  })
}
