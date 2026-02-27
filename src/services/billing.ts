import { get } from './api-client'
import type { BillingCycle, HouseholdFee, BillingException, BreakpointAnalysis } from '@/types/billing'

export function getBillingCycles() {
  return get<BillingCycle[]>('/billing/cycles')
}

export function getHouseholdFees() {
  return get<HouseholdFee[]>('/billing/fees')
}

export function getBillingExceptions(params?: Record<string, string>) {
  return get<BillingException[]>('/billing/exceptions', params)
}

export function getBreakpointAnalyses() {
  return get<BreakpointAnalysis[]>('/billing/breakpoints')
}
