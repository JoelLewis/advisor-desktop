import { useQuery } from '@tanstack/react-query'
import { getMyActions, getInProcess, getDelegated, getTemplates } from '@/services/workflows'

export function useMyActions(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['my-actions', params],
    queryFn: () => getMyActions(params),
  })
}

export function useInProcess() {
  return useQuery({
    queryKey: ['in-process'],
    queryFn: () => getInProcess(),
  })
}

export function useDelegated(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['delegated', params],
    queryFn: () => getDelegated(params),
  })
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => getTemplates(),
  })
}
