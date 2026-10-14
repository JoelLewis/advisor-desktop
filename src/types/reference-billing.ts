import type { FeeTierSlice } from '@/lib/fees'
import type { MethodNote } from './reference'

export type BillingMethod = 'advance' | 'arrears'
/** One quarterly run: the day it billed, the quarter end it valued at, and the quarter each method pays for. */
export type BillingRunDate = { id: string; runDate: string; valuationDate: string; advanceQuarter: string; arrearsQuarter: string }
export type BillingExceptionRecord = {
  id: string; householdId: string; runId: string; kind: 'schedule_mismatch' | 'collection_failed'; description: string; openedAt: string; resolvedAt?: string
}

export type HouseholdBilling = {
  householdId: string; householdName: string; segment: string; method: BillingMethod
  /** Today's combined value of the household's accounts, USD. */
  value: number
  annualFee: number; quarterlyFee: number; effectiveRate: number
  tiers: FeeTierSlice[]
  nextTier?: { at: number; rate: number }
  openExceptionIds: string[]
}
type BillingRunRow = { householdId: string; householdName: string; method: BillingMethod; covers: string; valuation: number; fee: number }
export type BillingRun = BillingRunDate & { households: BillingRunRow[]; total: number; exceptionIds: string[] }
export type BillingException = BillingExceptionRecord & { householdName: string }
export type BillingView = {
  asOf: string
  schedule: { name: string; tiers: { from: number; upTo: number | null; rate: number }[] }
  households: HouseholdBilling[]
  totals: { value: number; annualFee: number; quarterlyFee: number; effectiveRate: number }
  runs: BillingRun[]
  exceptions: BillingException[]
  methods: MethodNote[]
}
