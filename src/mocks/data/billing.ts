import type { BillingCycle, HouseholdFee, HouseholdFeeFixture, BillingException, BreakpointAnalysis } from '@/types/billing'
import { accounts } from './accounts'
import { households } from './households'
import { FX_RATES_USD_BASE } from './currencies'
import { deriveHouseholdAUM } from '@/lib/aum'
import { householdAnnualFee } from '@/lib/fees'

/**
 * Leaf data: the negotiated rate and billing method per household. `aumBasis` and
 * `quarterlyAmount` are derived below.
 *
 * D13 · fee-billing — Thompson was billed on a hand-typed $3,900,000 while the household's actual
 * AUM is $4,385,000, and exception bex-003 claimed it sat $100K below a $4M breakpoint it had
 * already cleared.
 * D16 · fee-disclosure — `feeType: 'flat'` on a percentage schedule is a mislabel; a flat fee is a
 * fixed dollar retainer. These are single-tier schedules.
 */
const feeTerms: HouseholdFeeFixture[] = [
  { householdId: 'hh-001', householdName: 'Johnson Household', feeType: 'tiered', annualRate: 0.0075, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-002', householdName: 'Chen-Wong Household', feeType: 'tiered', annualRate: 0.0065, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-003', householdName: 'Williams Household', feeType: 'tiered', annualRate: 0.0085, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-004', householdName: 'Martinez Household', feeType: 'tiered', annualRate: 0.0080, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-005', householdName: 'Thompson Household', feeType: 'breakpoint', annualRate: 0.0095, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-006', householdName: 'Anderson Household', feeType: 'tiered', annualRate: 0.0080, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-007', householdName: 'Patel Household', feeType: 'tiered', annualRate: 0.0080, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-008', householdName: "O'Brien Household", feeType: 'single_tier', annualRate: 0.0100, method: 'arrears', lastCollected: '2025-12-31', exceptions: ['missing_aum'] },
  { householdId: 'hh-009', householdName: 'Kim-Lee Household', feeType: 'single_tier', annualRate: 0.0100, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-010', householdName: 'Garcia Household', feeType: 'single_tier', annualRate: 0.0100, method: 'arrears', lastCollected: '2025-12-31', exceptions: ['schedule_mismatch'] },
  { householdId: 'hh-011', householdName: 'Foster Household', feeType: 'single_tier', annualRate: 0.0100, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-012', householdName: 'Taylor Household', feeType: 'single_tier', annualRate: 0.0100, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
  { householdId: 'hh-013', householdName: 'Mueller Household', feeType: 'tiered', annualRate: 0.0085, method: 'advance', lastCollected: '2026-01-02', exceptions: [] },
]

export const householdFees: HouseholdFee[] = feeTerms.map((t) => {
  const aumBasis = deriveHouseholdAUM(t.householdId, accounts, FX_RATES_USD_BASE)
  return { ...t, aumBasis, quarterlyAmount: householdAnnualFee(aumBasis, t.annualRate) / 4 }
})

const quarterlyTotal = householdFees.reduce((s, f) => s + f.quarterlyAmount, 0)

export const billingCycles: BillingCycle[] = [
  // D14 · fee-billing — `totalBilled` was 198,500 against a household sum of 181,688, and both
  // rendered on the same screen. D15 · fee-billing — a cycle whose fees were collected on
  // 2 January cannot still be in Review in late February.
  { id: 'bc-001', period: 'Q1 2026', stage: 'collection', stageCompletedAt: '2026-01-02', totalBilled: quarterlyTotal, totalCollected: quarterlyTotal, householdsCount: households.length, exceptionsCount: 2 },
  { id: 'bc-002', period: 'Q4 2025', stage: 'collection', stageCompletedAt: '2026-01-15', totalBilled: quarterlyTotal * 0.982, totalCollected: quarterlyTotal * 0.982, householdsCount: households.length, exceptionsCount: 1 },
  { id: 'bc-003', period: 'Q3 2025', stage: 'collection', stageCompletedAt: '2025-10-12', totalBilled: quarterlyTotal * 0.965, totalCollected: quarterlyTotal * 0.965, householdsCount: households.length, exceptionsCount: 0 },
]

export const billingExceptions: BillingException[] = [
  { id: 'bex-001', householdId: 'hh-008', householdName: "O'Brien Household", type: 'missing_aum', description: 'Held-away account balance not received from Vanguard. Cannot compute accurate AUM basis.', severity: 'high', createdAt: '2026-02-20T08:00:00Z' },
  { id: 'bex-002', householdId: 'hh-010', householdName: 'Garcia Household', type: 'schedule_mismatch', description: 'Fee schedule shows "advance" but account is set to "arrears" billing. Needs reconciliation.', severity: 'medium', createdAt: '2026-02-18T14:30:00Z' },
  { id: 'bex-003', householdId: 'hh-009', householdName: 'Kim-Lee Household', type: 'breakpoint_near_miss', description: 'Household AUM is $450,000 below the $1,500,000 breakpoint. Reaching it would reduce the rate from 1.00% to 0.90%, an estimated saving of $1,500 a year at the breakpoint balance.', severity: 'low', createdAt: '2026-02-15T09:00:00Z' },
  { id: 'bex-004', householdId: 'hh-004', householdName: 'Martinez Household', type: 'collection_failed', description: 'Q4 2025 fee collection failed — insufficient cash in primary account. Retry scheduled.', severity: 'high', createdAt: '2026-01-18T10:00:00Z', resolvedAt: '2026-01-22T11:00:00Z' },
]

/**
 * C30 · fee-billing — savings are the rate delta applied to the *breakpoint* balance, not to the
 * current balance. Kim-Lee reaching $1.5M at 0.90% against 1.00% saves $1,500/yr, not $1,050.
 *
 * Thompson (`hh-005`) is not listed here: its derived AUM of $4,385,000 is already above the $4M
 * breakpoint (D13), so there is no gap left to analyze.
 */
export const breakpointAnalyses: BreakpointAnalysis[] = [
  { householdId: 'hh-009', householdName: 'Kim-Lee Household', currentAUM: 1_050_000, nextBreakpoint: 1_500_000, gapToBreakpoint: 450_000, currentRate: 0.0100, breakpointRate: 0.0090, annualSavings: 1_500 },
  { householdId: 'hh-010', householdName: 'Garcia Household', currentAUM: 720_000, nextBreakpoint: 1_000_000, gapToBreakpoint: 280_000, currentRate: 0.0100, breakpointRate: 0.0095, annualSavings: 500 },
  { householdId: 'hh-011', householdName: 'Foster Household', currentAUM: 1_500_000, nextBreakpoint: 2_000_000, gapToBreakpoint: 500_000, currentRate: 0.0100, breakpointRate: 0.0090, annualSavings: 2_000 },
]
