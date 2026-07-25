export const BILLING_STAGES = ['valuation', 'calculation', 'review', 'collection'] as const
export type BillingStage = (typeof BILLING_STAGES)[number]

export const FEE_METHODS = ['advance', 'arrears'] as const
export type FeeMethod = (typeof FEE_METHODS)[number]

/**
 * D16 · fee-disclosure — `'flat'` on a percentage-of-AUM schedule is a mislabel; a flat fee is a
 * fixed dollar retainer. `'single_tier'` is a percentage schedule with no breakpoints.
 */
export const FEE_TYPES = ['single_tier', 'tiered', 'breakpoint'] as const
export type FeeType = (typeof FEE_TYPES)[number]

export type BillingCycle = {
  id: string
  period: string // e.g. "Q1 2026"
  stage: BillingStage
  stageCompletedAt?: string
  totalBilled: number
  totalCollected: number
  householdsCount: number
  exceptionsCount: number
}

export type HouseholdFee = {
  householdId: string
  householdName: string
  aumBasis: number
  feeType: FeeType
  annualRate: number
  quarterlyAmount: number
  method: FeeMethod
  lastCollected?: string
  waiver?: { type: string; discountBps: number; expiresAt: string }
  exceptions: string[]
}

export type BillingException = {
  id: string
  householdId: string
  householdName: string
  type: 'missing_aum' | 'schedule_mismatch' | 'breakpoint_near_miss' | 'collection_failed' | 'fee_override'
  description: string
  severity: 'low' | 'medium' | 'high'
  createdAt: string
  resolvedAt?: string
}

export type BreakpointAnalysis = {
  householdId: string
  householdName: string
  currentAUM: number
  nextBreakpoint: number
  gapToBreakpoint: number
  currentRate: number
  breakpointRate: number
  annualSavings: number
}

/**
 * D13 · fee-billing — the shape a fee-terms fixture is allowed to hold. `aumBasis` and
 * `quarterlyAmount` are derived from `accounts.ts` and must never appear in a literal.
 */
export type HouseholdFeeFixture = Omit<HouseholdFee, 'aumBasis' | 'quarterlyAmount'>
