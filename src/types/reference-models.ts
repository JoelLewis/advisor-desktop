import type { AssetClass } from './portfolio'
import type { RiskProfile } from '@/lib/risk-profile'
import type { MethodNote } from './reference'

export type BenchmarkComponent = { assetClass: AssetClass; index: string; weight: number }
/** `mandate` is a custom mandate's own benchmark, named in its account record; it follows no firm model. */
export type ModelBenchmark = { name: string; kind: 'policy_blend' | 'glide_path' | 'mandate'; components: BenchmarkComponent[] }
export type ModelTarget = { assetClass: AssetClass; targetWeight: number }
export type ModelChange = { id: string; type: 'weight_change' | 'security_add' | 'description_change'; description: string; assetClass?: AssetClass; oldValue?: number; newValue?: number }
export type ModelVersionRecord = {
  modelId: string; version: number; status: 'approved' | 'pending_approval'
  /** A firm person's id. */
  proposedBy: string
  approvedBy?: 'Investment Committee'; approvedOn?: string
  effectiveDate: string; changes: ModelChange[]; targets: ModelTarget[]
}
export type ModelSummary = {
  id: string; name: string; description: string; riskProfile: RiskProfile; riskLabel: string; benchmark: ModelBenchmark; equityShare: number
  currentVersion: number; pendingVersion?: { version: number; effectiveDate: string }
  assignedAccounts: number; totalValue: number; driftTolerance: number; rebalanceFrequency: string; volatility: number
}
export type ModelVersionView = ModelVersionRecord & { proposedByName: string }
export type ModelAccountRow = { accountId: string; accountName: string; clientName: string; value: number; maxAbsDrift: number; withinBand: boolean }
export type ModelDetail = ModelSummary & {
  asOf: string
  targets: (ModelTarget & { implementationSymbol?: string; index: string })[]
  versions: ModelVersionView[]; accounts: ModelAccountRow[]; methods: MethodNote[]
}
/** An account held at the client's own instruction: no model, no drift band. */
export type CustomMandateRow = { accountId: string; accountName: string; clientName: string; value: number; mandateSummary: string; benchmarkName: string }
export type ModelsView = { asOf: string; models: ModelSummary[]; customMandates: CustomMandateRow[]; methods: MethodNote[] }
