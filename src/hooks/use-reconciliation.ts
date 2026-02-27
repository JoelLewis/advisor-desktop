import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReconStatus, getBreaks, getIntegrationHealth, getDataQualitySummary, getReconTrending, resolveBreak } from '@/services/reconciliation'

export function useReconStatus() {
  return useQuery({
    queryKey: ['recon-status'],
    queryFn: getReconStatus,
    staleTime: 60_000,
  })
}

export function useReconBreaks(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['recon-breaks', params],
    queryFn: () => getBreaks(params),
    staleTime: 60_000,
  })
}

export function useIntegrationHealth() {
  return useQuery({
    queryKey: ['integration-health'],
    queryFn: getIntegrationHealth,
    staleTime: 60_000,
  })
}

export function useDataQualitySummary() {
  return useQuery({
    queryKey: ['data-quality-summary'],
    queryFn: getDataQualitySummary,
    staleTime: 60_000,
  })
}

export function useReconTrending() {
  return useQuery({
    queryKey: ['recon-trending'],
    queryFn: getReconTrending,
    staleTime: 120_000,
  })
}

export function useResolveBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resolveBreak,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-breaks'] })
      queryClient.invalidateQueries({ queryKey: ['data-quality-summary'] })
    },
  })
}
