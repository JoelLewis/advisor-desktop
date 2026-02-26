import { get } from './api-client'
import type { Document } from '@/types/document'

export function getDocuments(params?: Record<string, string>) {
  return get<Document[]>('/documents', params)
}

export function getClientDocuments(clientId: string) {
  return get<Document[]>(`/documents/clients/${clientId}`)
}

export function getTemplates() {
  return get<Document[]>('/documents/templates')
}
