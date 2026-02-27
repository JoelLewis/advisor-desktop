import { useQuery } from '@tanstack/react-query'
import { getBillingCycles, getHouseholdFees, getBillingExceptions, getBreakpointAnalyses } from '@/services/billing'

export function useBillingCycles() {
  return useQuery({
    queryKey: ['billing-cycles'],
    queryFn: getBillingCycles,
    staleTime: 60_000,
  })
}

export function useHouseholdFees() {
  return useQuery({
    queryKey: ['household-fees'],
    queryFn: getHouseholdFees,
    staleTime: 60_000,
  })
}

export function useBillingExceptions(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['billing-exceptions', params],
    queryFn: () => getBillingExceptions(params),
    staleTime: 60_000,
  })
}

export function useBreakpointAnalyses() {
  return useQuery({
    queryKey: ['breakpoint-analyses'],
    queryFn: getBreakpointAnalyses,
    staleTime: 60_000,
  })
}
