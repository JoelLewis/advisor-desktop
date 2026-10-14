import type { BillingMethod } from '@/types/reference-billing'
import type { BlotterStatus } from '@/types/reference-blotter'
import type { ModelSummary } from '@/types/reference-models'
import type { IntegrationStatus, MatchKind } from '@/types/reference-reconciliation'
import type { ToleranceStatus } from '@/types/reference-risk'

export const BILLING_METHOD_WORDS: Readonly<Record<BillingMethod, string>> = { advance: 'In advance', arrears: 'In arrears' }
export const BLOTTER_STATUS_WORDS: Readonly<Record<BlotterStatus, string>> = {
  working: 'Working', pending_compliance: 'Pending compliance', filled: 'Filled', cancelled: 'Canceled', withdrawn: 'Withdrawn', returned: 'Returned',
}
export const BLOTTER_STATUS_TAG: Readonly<Record<BlotterStatus, string>> = {
  working: 'WORKING', pending_compliance: 'PENDING COMPLIANCE', filled: 'FILLED', cancelled: 'CANCELED', withdrawn: 'WITHDRAWN', returned: 'RETURNED',
}
export const TOLERANCE_TAG: Readonly<Record<ToleranceStatus, string>> = { above: 'ABOVE TOLERANCE', within: 'WITHIN TOLERANCE', below: 'BELOW TOLERANCE' }
export const INTEGRATION_STATUS_TAG: Readonly<Record<IntegrationStatus, string>> = { synced: 'SYNCED', pending: 'PENDING', failed: 'FAILED' }
export const SEVERITY_WORDS: Readonly<Record<'low' | 'medium' | 'high', string>> = { low: 'Low', medium: 'Medium', high: 'High' }
export const MATCH_KIND_WORDS: Readonly<Record<MatchKind, string>> = { positions: 'Positions', cash: 'Cash', transactions: 'Transactions' }
export const FREQUENCY_WORDS: Readonly<Record<string, string>> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-annual', annual: 'Annual', threshold_only: 'On threshold only',
}
export const SEGMENT_WORDS: Readonly<Record<string, string>> = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }

/** A record's word from a map, or an error naming the value the map does not hold. */
export function wordFor(map: Readonly<Record<string, string>>, key: string): string {
  const word = map[key]
  if (word === undefined) throw new Error(`No word for "${key}"`)
  return word
}

/** "v2", or "v2 · v3 pending from 2026-04-01". */
export const versionWords = (m: Pick<ModelSummary, 'currentVersion' | 'pendingVersion'>) =>
  m.pendingVersion ? `v${m.currentVersion} · v${m.pendingVersion.version} pending from ${m.pendingVersion.effectiveDate}` : `v${m.currentVersion}`
