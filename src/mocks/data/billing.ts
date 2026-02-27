import type { BillingCycle, HouseholdFee, BillingException, BreakpointAnalysis } from '@/types/billing'

export const billingCycles: BillingCycle[] = [
  { id: 'bc-001', period: 'Q1 2026', stage: 'review', totalBilled: 198_500, totalCollected: 0, householdsCount: 13, exceptionsCount: 3 },
  { id: 'bc-002', period: 'Q4 2025', stage: 'collection', stageCompletedAt: '2026-01-15', totalBilled: 195_200, totalCollected: 192_100, householdsCount: 13, exceptionsCount: 1 },
  { id: 'bc-003', period: 'Q3 2025', stage: 'collection', stageCompletedAt: '2025-10-12', totalBilled: 191_800, totalCollected: 191_800, householdsCount: 13, exceptionsCount: 0 },
]

export const householdFees: HouseholdFee[] = [
  { householdId: 'hh-001', householdName: 'Johnson Household', aumBasis: 18_750_000, feeType: 'tiered', annualRate: 0.0075, quarterlyAmount: 35_156, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-002', householdName: 'Chen-Wong Household', aumBasis: 31_800_000, feeType: 'tiered', annualRate: 0.0065, quarterlyAmount: 51_675, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-003', householdName: 'Williams Household', aumBasis: 6_150_000, feeType: 'tiered', annualRate: 0.0085, quarterlyAmount: 13_069, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-004', householdName: 'Green Household', aumBasis: 4_200_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 10_500, method: 'arrears', lastCollected: '2025-12-31', exceptions: [] },
  { householdId: 'hh-005', householdName: 'Martinez Household', aumBasis: 3_800_000, feeType: 'breakpoint', annualRate: 0.0095, quarterlyAmount: 9_025, method: 'advance', lastCollected: '2026-01-02', exceptions: ['breakpoint_near_miss'] },
  { householdId: 'hh-006', householdName: 'Taylor Household', aumBasis: 2_900_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 7_250, method: 'advance', lastCollected: '2026-01-02', waiver: { type: 'First-year discount', discountBps: 25, expiresAt: '2026-06-30' }, exceptions: [] },
  { householdId: 'hh-007', householdName: 'Patel Household', aumBasis: 7_200_000, feeType: 'tiered', annualRate: 0.0080, quarterlyAmount: 14_400, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-008', householdName: 'Brown Household', aumBasis: 1_800_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 4_500, method: 'arrears', lastCollected: '2025-12-31', exceptions: ['missing_aum'] },
  { householdId: 'hh-009', householdName: 'Davis Household', aumBasis: 2_200_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 5_500, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-010', householdName: 'Wilson Household', aumBasis: 1_500_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 3_750, method: 'arrears', lastCollected: '2025-12-31', exceptions: ['schedule_mismatch'] },
  { householdId: 'hh-011', householdName: 'Garcia Household', aumBasis: 950_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 2_375, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-012', householdName: 'Lee Household', aumBasis: 750_000, feeType: 'flat', annualRate: 0.0100, quarterlyAmount: 1_875, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-013', householdName: 'Mueller Household', aumBasis: 5_400_000, feeType: 'tiered', annualRate: 0.0085, quarterlyAmount: 11_475, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
]

export const billingExceptions: BillingException[] = [
  { id: 'bex-001', householdId: 'hh-008', householdName: 'Brown Household', type: 'missing_aum', description: 'Held-away account balance not received from Vanguard. Cannot compute accurate AUM basis.', severity: 'high', createdAt: '2026-02-20T08:00:00Z' },
  { id: 'bex-002', householdId: 'hh-010', householdName: 'Wilson Household', type: 'schedule_mismatch', description: 'Fee schedule shows "advance" but account is set to "arrears" billing. Needs reconciliation.', severity: 'medium', createdAt: '2026-02-18T14:30:00Z' },
  { id: 'bex-003', householdId: 'hh-005', householdName: 'Martinez Household', type: 'breakpoint_near_miss', description: 'AUM is $200K below $4M breakpoint. Consolidating held-away assets would save $950/yr.', severity: 'low', createdAt: '2026-02-15T09:00:00Z' },
  { id: 'bex-004', householdId: 'hh-004', householdName: 'Green Household', type: 'collection_failed', description: 'Q4 2025 fee collection failed — insufficient cash in primary account. Retry scheduled.', severity: 'high', createdAt: '2026-01-18T10:00:00Z', resolvedAt: '2026-01-22T11:00:00Z' },
]

export const breakpointAnalyses: BreakpointAnalysis[] = [
  { householdId: 'hh-005', householdName: 'Martinez Household', currentAUM: 3_800_000, nextBreakpoint: 4_000_000, gapToBreakpoint: 200_000, currentRate: 0.0095, breakpointRate: 0.0085, annualSavings: 950 },
  { householdId: 'hh-009', householdName: 'Davis Household', currentAUM: 2_200_000, nextBreakpoint: 2_500_000, gapToBreakpoint: 300_000, currentRate: 0.0100, breakpointRate: 0.0095, annualSavings: 550 },
  { householdId: 'hh-011', householdName: 'Garcia Household', currentAUM: 950_000, nextBreakpoint: 1_000_000, gapToBreakpoint: 50_000, currentRate: 0.0100, breakpointRate: 0.0095, annualSavings: 238 },
]
