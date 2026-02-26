import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNBAs, getNBATemplates, getNBAEffectiveness, dismissNBA, snoozeNBA } from '@/services/nba'

export function useNBAs(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['nbas', params],
    queryFn: () => getNBAs(params),
  })
}

export function useDismissNBA() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dismissNBA,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nbas'] }),
  })
}

export function useSnoozeNBA() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) => snoozeNBA(id, until),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nbas'] }),
  })
}

export function useNBATemplates(id: string | null) {
  return useQuery({
    queryKey: ['nba', 'templates', id],
    queryFn: () => getNBATemplates(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

export function useNBAEffectiveness() {
  return useQuery({
    queryKey: ['nba', 'effectiveness'],
    queryFn: getNBAEffectiveness,
    staleTime: 30_000,
  })
}
