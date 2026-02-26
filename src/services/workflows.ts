import { get, post, put } from './api-client'
import type { Task, ProcessTracker, WorkflowTemplate } from '@/types/workflow'

export function getMyActions(params?: Record<string, string>) {
  return get<Task[]>('/workflows/my-actions', params)
}

export function getInProcess(params?: Record<string, string>) {
  return get<ProcessTracker[]>('/workflows/in-process', params)
}

export function getDelegated(params?: Record<string, string>) {
  return get<Task[]>('/workflows/delegated', params)
}

export function getTemplates() {
  return get<WorkflowTemplate[]>('/workflows/templates')
}

export function updateTask(id: string, updates: Partial<Task>) {
  return put<Task>(`/workflows/tasks/${id}`, updates)
}

export function delegateTask(id: string, delegateTo: string, delegationType: string) {
  return post<Task>(`/workflows/tasks/${id}/delegate`, { delegateTo, delegationType })
}
