import type { MethodNote } from './reference'

export type FactorId = 'market' | 'size' | 'value' | 'momentum' | 'quality' | 'rates' | 'credit'
export type FactorRow = { factor: FactorId; label: string; exposure: number; benchmark: number; active: number }
/** `glide_path`: a 529 whose risk follows the beneficiary's horizon, not measured against the owner's questionnaire. */
export type ToleranceStatus = 'above' | 'within' | 'below' | 'glide_path'
export type RiskPosture = {
  /** The account's σ on the questionnaire's 0–100 scale, whole points. */
  score: number; band: string
  /** The client's questionnaire score and the band it falls in, inclusive. */
  tolerance: { clientId: string; clientName: string; score: number; band: string; floor: number; ceiling: number; assessedOn: string }
  status: ToleranceStatus
  /**
   * Points past the client's band: score − ceiling above it (positive), score − floor below it
   * (negative), 0 within it or on a glide path. Tolerance is a band, not a point.
   */
  beyond: number
  /** score − ceiling: how close a within-band account sits to the top of its client's band (≤ 0 within it). */
  headroom: number
  /** The order the book is read in, highest first: above, then below, each by |beyond|; within by headroom; glide paths last. */
  sortKey: number
}
type StressRow = { id: string; name: string; description: string; impact: number; impactValue: number }
type ConcentrationRow = { symbol: string; name: string; weight: number; limit: number; kind: string; breached: boolean }
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
type BookRiskRow = { accountId: string; accountName: string; householdName: string; clientName: string; mandateName: string; value: number; volatility: number; var95: number; posture: RiskPosture }
export type BookRiskView = { asOf: string; rows: BookRiskRow[]; aboveTolerance: number; belowTolerance: number; methods: MethodNote[] }
