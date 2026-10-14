import type { BillingExceptionRecord, BillingMethod, BillingRunDate } from '@/types/reference-billing'

/**
 * Leaf data only: how each household's agreement bills, the firm's quarterly runs, and the exceptions
 * those runs raised. Every figure — value, fee, run total — is derived in `src/mocks/reference/billing.ts`.
 *
 * Phase 7a · R1 — the hand-typed per-household rates ("tiered" on a flat rate) and breakpoint analyses
 * are gone: every household bills on the firm's one tiered schedule.
 */
export const FEE_TERMS: readonly { householdId: string; method: BillingMethod }[] = [
  { householdId: 'hh-001', method: 'advance' }, { householdId: 'hh-002', method: 'advance' }, { householdId: 'hh-003', method: 'advance' },
  { householdId: 'hh-004', method: 'advance' }, { householdId: 'hh-005', method: 'advance' }, { householdId: 'hh-006', method: 'advance' },
  { householdId: 'hh-007', method: 'advance' }, { householdId: 'hh-008', method: 'arrears' }, { householdId: 'hh-009', method: 'advance' },
  { householdId: 'hh-010', method: 'arrears' }, { householdId: 'hh-011', method: 'advance' }, { householdId: 'hh-012', method: 'advance' },
  { householdId: 'hh-013', method: 'advance' },
]

/** The firm bills on the first trading day of each quarter, on the value at the quarter end before it (R2). */
export const BILLING_RUNS: readonly BillingRunDate[] = [
  { id: 'run-2025-07', runDate: '2025-07-01', valuationDate: '2025-06-30', advanceQuarter: 'Q3 2025', arrearsQuarter: 'Q2 2025' },
  { id: 'run-2025-10', runDate: '2025-10-01', valuationDate: '2025-09-30', advanceQuarter: 'Q4 2025', arrearsQuarter: 'Q3 2025' },
  { id: 'run-2026-01', runDate: '2026-01-02', valuationDate: '2025-12-31', advanceQuarter: 'Q1 2026', arrearsQuarter: 'Q4 2025' },
]

export const BILLING_EXCEPTIONS: readonly BillingExceptionRecord[] = [
  {
    id: 'bex-002', householdId: 'hh-010', runId: 'run-2026-01', kind: 'schedule_mismatch', openedAt: '2026-02-18T14:30:00Z',
    description: "Her advisory agreement bills in arrears; the custodian's fee file still lists her as billed in advance. Correct the custodian file before the April run.",
  },
  {
    id: 'bex-004', householdId: 'hh-004', runId: 'run-2026-01', kind: 'collection_failed', openedAt: '2026-01-05T15:00:00Z', resolvedAt: '2026-01-22T16:00:00Z',
    description: "The 2 January run's fee debit failed: not enough cash in the primary account. Retried and collected on 22 January.",
  },
]
