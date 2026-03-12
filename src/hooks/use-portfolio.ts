import { useQuery } from '@tanstack/react-query'
import { getPositions, getHoldingGroups, getDrift, getDriftSummary, getPerformance, getBenchmarkComparison, getAttribution, getModels } from '@/services/pms'
import { getHouseholdPositions, getHouseholdDrift, getHouseholdAllocation } from '@/services/pms'
import { getRiskMetrics, getFactorExposures, getStressScenarios, getSensitivity, getConcentration, getModelGovernance, getBookOfBusiness } from '@/services/pms'

export function usePositions(accountId: string) {
  return useQuery({
    queryKey: ['positions', accountId],
    queryFn: () => getPositions(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useHoldingGroups(accountId: string) {
  return useQuery({
    queryKey: ['holdings', accountId],
    queryFn: () => getHoldingGroups(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useDrift(accountId: string) {
  return useQuery({
    queryKey: ['drift', accountId],
    queryFn: () => getDrift(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  })
}

export function usePerformance(accountId: string) {
  return useQuery({
    queryKey: ['performance', accountId],
    queryFn: () => getPerformance(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useBenchmark(accountId: string) {
  return useQuery({
    queryKey: ['benchmark', accountId],
    queryFn: () => getBenchmarkComparison(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useAttribution(accountId: string, period?: string) {
  return useQuery({
    queryKey: ['attribution', accountId, period],
    queryFn: () => getAttribution(accountId, period),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useRiskMetrics(accountId: string) {
  return useQuery({
    queryKey: ['risk', accountId],
    queryFn: () => getRiskMetrics(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useFactorExposures(accountId: string) {
  return useQuery({
    queryKey: ['factors', accountId],
    queryFn: () => getFactorExposures(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useStressScenarios(accountId: string) {
  return useQuery({
    queryKey: ['stress', accountId],
    queryFn: () => getStressScenarios(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => getModels(),
    staleTime: 60_000,
  })
}

export function useDriftSummary() {
  return useQuery({
    queryKey: ['drift', 'summary'],
    queryFn: () => getDriftSummary(),
    staleTime: 30_000,
  })
}

export function useHouseholdPositions(householdId: string) {
  return useQuery({
    queryKey: ['household-positions', householdId],
    queryFn: () => getHouseholdPositions(householdId),
    enabled: !!householdId,
    staleTime: 60_000,
  })
}

export function useHouseholdDrift(householdId: string) {
  return useQuery({
    queryKey: ['household-drift', householdId],
    queryFn: () => getHouseholdDrift(householdId),
    enabled: !!householdId,
    staleTime: 30_000,
  })
}

export function useHouseholdAllocation(householdId: string) {
  return useQuery({
    queryKey: ['household-allocation', householdId],
    queryFn: () => getHouseholdAllocation(householdId),
    enabled: !!householdId,
    staleTime: 60_000,
  })
}

export function useSensitivity(accountId: string) {
  return useQuery({
    queryKey: ['sensitivity', accountId],
    queryFn: () => getSensitivity(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useConcentration(accountId: string) {
  return useQuery({
    queryKey: ['concentration', accountId],
    queryFn: () => getConcentration(accountId),
    enabled: !!accountId,
    staleTime: 60_000,
  })
}

export function useModelGovernance() {
  return useQuery({
    queryKey: ['models', 'governance'],
    queryFn: () => getModelGovernance(),
    staleTime: 30_000,
  })
}

export function useBookOfBusiness() {
  return useQuery({
    queryKey: ['book-of-business'],
    queryFn: () => getBookOfBusiness(),
    staleTime: 60_000,
  })
}
