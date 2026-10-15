import type { MethodNote } from './reference'

export type PracticeHousehold = { householdId: string; name: string; segment: string; since: string; value: number; annualFee: number; effectiveRate: number; shareOfRevenue: number }
export type PracticeView = {
  asOf: string
  book: { value: number; households: number; clients: number; accounts: number }
  revenue: { annual: number; effectiveRate: number; lastRun: { id: string; runDate: string; total: number } }
  bySegment: { segment: string; households: number; value: number; annualFee: number; effectiveRate: number }[]
  byAccountType: { type: string; accounts: number; value: number }[]
  byCustodian: { custodian: string; accounts: number; value: number }[]
  tenure: { bucket: string; households: number }[]
  concentration: { hhi: number; effectiveN: number }
  households: PracticeHousehold[]
  methods: MethodNote[]
}
