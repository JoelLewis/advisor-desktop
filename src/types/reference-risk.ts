import type { MethodNote } from './reference'

export type FactorId = 'market' | 'size' | 'value' | 'momentum' | 'quality' | 'rates' | 'credit'
export type FactorRow = { factor: FactorId; label: string; exposure: number; benchmark: number; active: number }
export type ToleranceStatus = 'above' | 'within' | 'below'
export type RiskPosture = {
  /** The account's σ on the questionnaire's 0–100 scale, whole points. */
  score: number; band: string
  tolerance: { clientId: string; clientName: string; score: number; band: string; assessedOn: string }
  status: ToleranceStatus
  /** score − tolerance score. */
  gap: number
}
export type StressRow = { id: string; name: string; description: string; impact: number; impactValue: number }
export type ConcentrationRow = { symbol: string; name: string; weight: number; limit: number; kind: string; breached: boolean }
export type AccountRiskView = {
  asOf: string; accountId: string; accountName: string; clientName: string
  /** The model's id, or null for a custom mandate. */
  modelId: string | null
  /** The model's name, or "Custom mandate". */
  mandateName: string; benchmarkName: string
  /** USD. */
  value: number
  volatility: number; beta: number
  var95: { value: number; percent: number; horizon: 'one month'; confidence: number; method: 'parametric normal' }
  trackingError: number
  posture: RiskPosture
  factors: FactorRow[]
  concentration: { hhi: number; effectiveN: number; breaches: number; top: ConcentrationRow[] }
  stress: StressRow[]
  methods: MethodNote[]
}
export type BookRiskRow = { accountId: string; accountName: string; householdName: string; clientName: string; mandateName: string; value: number; volatility: number; var95: number; posture: RiskPosture }
export type BookRiskView = { asOf: string; rows: BookRiskRow[]; aboveTolerance: number; methods: MethodNote[] }
