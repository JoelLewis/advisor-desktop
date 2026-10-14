import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/services/reference'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { AttributionPeriod } from '@/types/reference-attribution'
import type { BlotterFilters } from '@/types/reference-blotter'
import type { ResolveBreakRequest } from '@/types/reference-reconciliation'
import { useInvalidateWorkspace } from './use-workspace'

/** Under the workspace prefix, so a release, a resolve or a take refreshes every reference view. */
const key = (viewerId: string, ...rest: unknown[]) => ['workspace', viewerId, 'reference', ...rest]

export function useBilling(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'billing'), queryFn: () => api.getBilling(viewerId), enabled })
}

export function usePractice(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'practice'), queryFn: () => api.getPractice(viewerId), enabled })
}

export function useReconciliation(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'reconciliation'), queryFn: () => api.getReconciliation(viewerId), enabled })
}

export function useBookRisk(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'risk'), queryFn: () => api.getBookRisk(viewerId), enabled })
}

export function useAccountRisk(accountId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'risk', accountId), queryFn: () => api.getAccountRisk(viewerId, accountId), enabled })
}

export function useReferenceAttribution(accountId: string, period: AttributionPeriod, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: key(viewerId, 'attribution', accountId, period), queryFn: () => api.getReferenceAttribution(viewerId, accountId, period),
    enabled, placeholderData: keepPreviousData,
  })
}

export function useReferenceModels(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'models'), queryFn: () => api.getReferenceModels(viewerId), enabled })
}

export function useReferenceModel(modelId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'models', modelId), queryFn: () => api.getReferenceModel(viewerId, modelId), enabled })
}

export function useBlotter(filters: BlotterFilters, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: key(viewerId, 'blotter', filters), queryFn: () => api.getBlotter(viewerId, filters), enabled, placeholderData: keepPreviousData })
}

// Invalidate on settle, not success: a refused resolve (resolved meanwhile) must refresh what is on screen too.
export function useResolveBreak() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (request: ResolveBreakRequest) => api.resolveBreak(viewerId, request), onSettled: invalidate })
}
