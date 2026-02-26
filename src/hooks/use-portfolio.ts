import { useQuery } from '@tanstack/react-query'
import { getPositions, getHoldingGroups, getDrift, getDriftSummary, getPerformance, getBenchmarkComparison, getAttribution, getModels } from '@/services/pms'
import { getHouseholdPositions, getHouseholdDrift, getHouseholdAllocation } from '@/services/pms'
import { getRiskMetrics, getFactorExposures, getStressScenarios, getSensitivity, getConcentration, getModelGovernance } from '@/services/pms'

export function usePositions(accountId: string) {
  return useQuery({
    queryKey: ['positions', accountId],
    queryFn: () => getPositions(accountId),
    enabled: !!accountId,
  })
}

export function useHoldingGroups(accountId: string) {
  return useQuery({
    queryKey: ['holdings', accountId],
    queryFn: () => getHoldingGroups(accountId),
    enabled: !!accountId,
  })
}

export function useDrift(accountId: string) {
  return useQuery({
    queryKey: ['drift', accountId],
    queryFn: () => getDrift(accountId),
    enabled: !!accountId,
  })
}

export function usePerformance(accountId: string) {
  return useQuery({
    queryKey: ['performance', accountId],
    queryFn: () => getPerformance(accountId),
    enabled: !!accountId,
  })
}

export function useBenchmark(accountId: string) {
  return useQuery({
    queryKey: ['benchmark', accountId],
    queryFn: () => getBenchmarkComparison(accountId),
    enabled: !!accountId,
  })
}

export function useAttribution(accountId: string, period?: string) {
  return useQuery({
    queryKey: ['attribution', accountId, period],
    queryFn: () => getAttribution(accountId, period),
    enabled: !!accountId,
  })
}

export function useRiskMetrics(accountId: string) {
  return useQuery({
    queryKey: ['risk', accountId],
    queryFn: () => getRiskMetrics(accountId),
    enabled: !!accountId,
  })
}

export function useFactorExposures(accountId: string) {
  return useQuery({
    queryKey: ['factors', accountId],
    queryFn: () => getFactorExposures(accountId),
    enabled: !!accountId,
  })
}

export function useStressScenarios(accountId: string) {
  return useQuery({
    queryKey: ['stress', accountId],
    queryFn: () => getStressScenarios(accountId),
    enabled: !!accountId,
  })
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => getModels(),
  })
}

export function useDriftSummary() {
  return useQuery({
    queryKey: ['drift', 'summary'],
    queryFn: () => getDriftSummary(),
  })
}

export function useHouseholdPositions(householdId: string) {
  return useQuery({
    queryKey: ['household-positions', householdId],
    queryFn: () => getHouseholdPositions(householdId),
    enabled: !!householdId,
  })
}

export function useHouseholdDrift(householdId: string) {
  return useQuery({
    queryKey: ['household-drift', householdId],
    queryFn: () => getHouseholdDrift(householdId),
    enabled: !!householdId,
  })
}

export function useHouseholdAllocation(householdId: string) {
  return useQuery({
    queryKey: ['household-allocation', householdId],
    queryFn: () => getHouseholdAllocation(householdId),
    enabled: !!householdId,
  })
}

export function useSensitivity(accountId: string) {
  return useQuery({
    queryKey: ['sensitivity', accountId],
    queryFn: () => getSensitivity(accountId),
    enabled: !!accountId,
  })
}

export function useConcentration(accountId: string) {
  return useQuery({
    queryKey: ['concentration', accountId],
    queryFn: () => getConcentration(accountId),
    enabled: !!accountId,
  })
}

export function useModelGovernance() {
  return useQuery({
    queryKey: ['models', 'governance'],
    queryFn: () => getModelGovernance(),
    staleTime: 30_000,
  })
}
