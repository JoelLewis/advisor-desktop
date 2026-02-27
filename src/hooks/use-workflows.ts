import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyActions, getInProcess, getDelegated, getTemplates, createTask, startWorkflow, createTemplate, updateTemplate, deleteTemplate } from '@/services/workflows'
import type { Task, WorkflowTemplate } from '@/types/workflow'

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

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<Task, 'title' | 'priority' | 'dueDate'> & { clientId?: string; clientName?: string }) => createTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-actions'] }),
  })
}

export function useStartWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { templateId: string; clientId?: string; clientName?: string; priority: string }) => startWorkflow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-actions'] })
      qc.invalidateQueries({ queryKey: ['in-process'] })
    },
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<WorkflowTemplate, 'id'>) => createTemplate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-templates'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<WorkflowTemplate>) => updateTemplate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-templates'] }),
  })
}
