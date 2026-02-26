import { get } from './api-client'
import type { Client } from '@/types/client'
import type { Household } from '@/types/household'
import type { ActivityItem } from '@/types/activity'
import type { PaginatedResponse } from '@/types/common'

export function getClients(params?: Record<string, string>) {
  return get<PaginatedResponse<Client>>('/crm/clients', params)
}

export function getClient(id: string) {
  return get<Client>(`/crm/clients/${id}`)
}

export function getHouseholds(params?: Record<string, string>) {
  return get<PaginatedResponse<Household>>('/crm/households', params)
}

export function getHousehold(id: string) {
  return get<Household>(`/crm/households/${id}`)
}

export function getActivities(params?: Record<string, string>) {
  return get<PaginatedResponse<ActivityItem>>('/crm/activities', params)
}

export function getClientActivities(clientId: string) {
  return get<ActivityItem[]>(`/crm/clients/${clientId}/activities`)
}
