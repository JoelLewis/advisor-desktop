import { get } from './api-client'
import type { FinancialPlan, Goal } from '@/types/planning'

export function getPlan(clientId: string) {
  return get<FinancialPlan>(`/planning/clients/${clientId}/plan`)
}

export function getGoals(clientId: string) {
  return get<Goal[]>(`/planning/clients/${clientId}/goals`)
}

export function getHouseholdPlan(householdId: string) {
  return get<FinancialPlan>(`/planning/households/${householdId}/plan`)
}
