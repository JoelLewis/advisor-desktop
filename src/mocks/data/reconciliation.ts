import type { IntegrationLogEntry, ReconBreakRecord } from '@/types/reference-reconciliation'

/**
 * Leaf data: each break states only how far the custodian's figure sat from the book's; the book's side is
 * read off the book at read time (R6). brk-002 is this morning's open break; the rest are seeded history,
 * resolved before the session, so the 30-day trend reads something real. Every account is a USD account
 * the story does not move.
 */
export const RECON_BREAKS: readonly ReconBreakRecord[] = [
  { id: 'brk-101', accountId: 'acc-011', field: 'cash_balance', custodianDelta: -310, severity: 'low', detectedAt: '2026-01-27T07:00:00Z', resolvedBeforeSession: '2026-01-27T16:05:00Z' },
  { id: 'brk-102', accountId: 'acc-007', field: 'market_value', custodianDelta: 2_400, severity: 'medium', detectedAt: '2026-02-03T07:00:00Z', resolvedBeforeSession: '2026-02-04T14:20:00Z' },
  { id: 'brk-103', accountId: 'acc-029', field: 'market_value', custodianDelta: -880, severity: 'low', detectedAt: '2026-02-09T07:00:00Z', resolvedBeforeSession: '2026-02-11T15:00:00Z' },
  { id: 'brk-104', accountId: 'acc-022', field: 'cash_balance', custodianDelta: 1_000, severity: 'medium', detectedAt: '2026-02-12T07:00:00Z', resolvedBeforeSession: '2026-02-12T18:30:00Z' },
  { id: 'brk-105', accountId: 'acc-045', field: 'market_value', custodianDelta: -1_150, severity: 'low', detectedAt: '2026-02-18T07:00:00Z', resolvedBeforeSession: '2026-02-19T15:40:00Z' },
  { id: 'brk-005', accountId: 'acc-014', field: 'market_value', custodianDelta: -1_250, severity: 'low', detectedAt: '2026-02-23T07:00:00Z', resolvedBeforeSession: '2026-02-23T08:20:00Z' },
  { id: 'brk-003', accountId: 'acc-006', field: 'position_quantity', symbol: 'EFA', custodianDelta: -20, severity: 'medium', detectedAt: '2026-02-24T07:00:00Z', resolvedBeforeSession: '2026-02-24T09:00:00Z' },
  { id: 'brk-004', accountId: 'acc-003', field: 'transaction_count', custodianDelta: -1, severity: 'low', detectedAt: '2026-02-24T07:00:00Z', resolvedBeforeSession: '2026-02-24T07:45:00Z' },
  { id: 'brk-002', accountId: 'acc-001', field: 'cash_balance', custodianDelta: -150, severity: 'medium', detectedAt: '2026-02-25T07:00:00Z' },
]

export const PLANNING_INTEGRATION = 'MoneyGuidePro'

/** Why each feed shows the sync time it does (R6). A feed outside the US syncs on its own market's close. */
export const INTEGRATION_LOG: readonly IntegrationLogEntry[] = [
  { integration: 'Schwab', at: '2026-02-24T07:00:00Z', status: 'synced', detail: 'Nightly positions, cash and transactions file for 23 Feb received and matched.' },
  { integration: 'Schwab', at: '2026-02-25T07:00:00Z', status: 'synced', detail: 'Nightly positions, cash and transactions file for 24 Feb received; one cash break raised (brk-002).' },
  { integration: 'Fidelity', at: '2026-02-25T07:00:00Z', status: 'synced', detail: 'Nightly file for 24 Feb received and matched.' },
  { integration: 'Vanguard', at: '2026-02-25T07:00:00Z', status: 'synced', detail: 'Nightly file for 24 Feb received and matched.' },
  { integration: 'HSBC', at: '2026-02-24T23:00:00Z', status: 'synced', detail: 'Hong Kong file for 24 Feb received overnight, after the Hong Kong close; it syncs hours before the US feeds.' },
  { integration: 'DBS', at: '2026-02-24T23:30:00Z', status: 'synced', detail: 'Singapore file for 24 Feb received overnight, after the Singapore close.' },
  { integration: 'UBS', at: '2026-02-25T05:00:00Z', status: 'synced', detail: 'Zurich file for 24 Feb received at the start of the European day.' },
  { integration: 'Coinbase', at: '2026-02-25T00:05:00Z', status: 'synced', detail: 'Balances snapshot at 00:00 UTC; digital assets trade every day, so the feed closes at midnight UTC.' },
  { integration: PLANNING_INTEGRATION, at: '2026-02-24T22:00:00Z', status: 'synced', detail: 'Plans synced.' },
  { integration: PLANNING_INTEGRATION, at: '2026-02-25T07:00:00Z', status: 'pending', detail: "Nightly export requested; MoneyGuidePro has not returned it (a delay on the provider's side). Planning figures stay as of the 24 Feb 22:00 UTC sync." },
]
