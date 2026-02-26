import { get } from './api-client'
import type { Prospect } from '@/types/prospect'

export function getProspects(params?: Record<string, string>) {
  return get<Prospect[]>('/prospects', params)
}

export function getProspect(id: string) {
  return get<Prospect>(`/prospects/${id}`)
}
