import { get, post } from './api-client'
import type { Note } from '@/types/note'

export function getClientNotes(clientId: string) {
  return get<Note[]>(`/crm/clients/${clientId}/notes`)
}

export function createNote(clientId: string, content: string) {
  return post<Note>(`/crm/clients/${clientId}/notes`, { content })
}
