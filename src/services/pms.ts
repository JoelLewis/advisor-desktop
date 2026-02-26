import { get } from './api-client'
import type { Position, DriftStatus, ModelAssignment, HoldingGroup, ModelGovernanceDetail } from '@/types/portfolio'
import type { PerformanceSeries, BenchmarkComparison, AttributionResult } from '@/types/performance'
import type { RiskMetrics, FactorExposure, StressScenario } from '@/types/risk'

export function getPositions(accountId: string) {
  return get<Position[]>(`/pms/accounts/${accountId}/positions`)
}

export function getHoldingGroups(accountId: string) {
  return get<HoldingGroup[]>(`/pms/accounts/${accountId}/holdings`)
}

export function getDrift(accountId: string) {
  return get<DriftStatus>(`/pms/accounts/${accountId}/drift`)
}

export function getModels() {
  return get<ModelAssignment[]>('/pms/models')
}

export function getModel(id: string) {
  return get<ModelAssignment>(`/pms/models/${id}`)
}

export function getPerformance(accountId: string, params?: Record<string, string>) {
  return get<PerformanceSeries[]>(`/pms/accounts/${accountId}/performance`, params)
}

export function getBenchmarkComparison(accountId: string) {
  return get<BenchmarkComparison[]>(`/pms/accounts/${accountId}/benchmark`)
}

export function getAttribution(accountId: string, period?: string) {
  const params = period ? { period } : undefined
  return get<AttributionResult[]>(`/pms/accounts/${accountId}/attribution`, params)
}

export function getRiskMetrics(accountId: string) {
  return get<RiskMetrics>(`/pms/accounts/${accountId}/risk`)
}

export function getFactorExposures(accountId: string) {
  return get<FactorExposure[]>(`/pms/accounts/${accountId}/factors`)
}

export function getStressScenarios(accountId: string) {
  return get<StressScenario[]>(`/pms/accounts/${accountId}/stress`)
}

export type SensitivityShock = { shock: number; impact: number }

export type MonteCarloResult = {
  simulations: number
  horizon: string
  percentiles: { percentile: number; value: number }[]
  histogram: { returnBucket: number; frequency: number }[]
}

export type SensitivityAnalysis = {
  interestRate: SensitivityShock[]
  equity: SensitivityShock[]
  credit: SensitivityShock[]
  monteCarlo: MonteCarloResult
}

export type ConcentrationMetric = {
  positionId: string
  symbol: string
  name: string
  assetClass: string
  marketValue: number
  weight: number
  limit: number
  breached: boolean
}

export type ConcentrationSummary = {
  top10Weight: number
  herfindahlIndex: number
  breachCount: number
  totalPositions: number
}

export type ConcentrationAnalysis = {
  positions: ConcentrationMetric[]
  summary: ConcentrationSummary
}

export function getSensitivity(accountId: string) {
  return get<SensitivityAnalysis>(`/pms/accounts/${accountId}/sensitivity`)
}

export function getConcentration(accountId: string) {
  return get<ConcentrationAnalysis>(`/pms/accounts/${accountId}/concentration`)
}

export type MetricsSummary = {
  totalAUM: number
  totalClients: number
  pendingTasks: number
  meetingsToday: number
  alertCount: number
  netFlowsMTD: number
}

export function getMetricsSummary() {
  return get<MetricsSummary>('/pms/metrics')
}

export function getDriftSummary() {
  return get<DriftStatus[]>('/pms/drift/summary')
}

export function getHouseholdPositions(householdId: string) {
  return get<Position[]>(`/pms/households/${householdId}/positions`)
}

export function getHouseholdDrift(householdId: string) {
  return get<DriftStatus[]>(`/pms/households/${householdId}/drift`)
}

type AllocationSlice = { assetClass: string; weight: number; value: number }

export function getHouseholdAllocation(householdId: string) {
  return get<AllocationSlice[]>(`/pms/households/${householdId}/allocation`)
}

export function getModelGovernance() {
  return get<ModelGovernanceDetail[]>('/pms/models/governance')
}
