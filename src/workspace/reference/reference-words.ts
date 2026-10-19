import type { BillingMethod } from '@/types/reference-billing'
import type { BlotterStatus } from '@/types/reference-blotter'
import type { ModelBenchmark, ModelSummary } from '@/types/reference-models'
import type { IntegrationStatus, MatchKind } from '@/types/reference-reconciliation'
import type { RiskPosture, ToleranceStatus } from '@/types/reference-risk'
import { fmtDayMonthYear, fmtPoints } from '@/kit/measure'
import { assetClassLabel } from '@/workspace/asset-class-label'

export const BILLING_METHOD_WORDS: Readonly<Record<BillingMethod, string>> = { advance: 'In advance', arrears: 'In arrears' }
export const BLOTTER_STATUS_WORDS: Readonly<Record<BlotterStatus, string>> = {
  working: 'Working', pending_compliance: 'Pending compliance release', filled: 'Filled', canceled: 'Canceled', withdrawn: 'Withdrawn', returned: 'Returned',
}
export const BLOTTER_STATUS_TAG: Readonly<Record<BlotterStatus, string>> = {
  working: 'WORKING', pending_compliance: 'PENDING COMPLIANCE RELEASE', filled: 'FILLED', canceled: 'CANCELED', withdrawn: 'WITHDRAWN', returned: 'RETURNED',
}
export const TOLERANCE_TAG: Readonly<Record<ToleranceStatus, string>> = { above: 'ABOVE TOLERANCE', within: 'WITHIN TOLERANCE', below: 'BELOW TOLERANCE', glide_path: 'GLIDE PATH' }
/** An account whose model sits outside the client's band where its tax treatment allows, with the client's accounts as a whole within it: not a suitability flag. */
export const ASSET_LOCATION_TAG = 'ASSET LOCATION'

const pointsWords = (n: number) => `${fmtPoints(n)} ${n === 1 ? 'pt' : 'pts'}`
/** "Moderate Conservative (26–40)": the client's tolerance as the band it is. */
export const toleranceBandWords = (p: RiskPosture) => `${p.tolerance.band} (${fmtPoints(p.tolerance.floor)}–${fmtPoints(p.tolerance.ceiling)})`
/** Where the account's score sits against its client's band: "+10 pts above Moderate Conservative (26–40)". */
export function beyondWords(p: RiskPosture): string {
  switch (p.status) {
    case 'above': return `+${pointsWords(p.beyond)} above ${toleranceBandWords(p)}`
    case 'below': return `−${pointsWords(-p.beyond)} below ${toleranceBandWords(p)}`
    case 'within': return `within ${toleranceBandWords(p)}, ${pointsWords(-p.headroom)} under its ceiling`
    case 'glide_path': return "the beneficiary's horizon, not the owner's questionnaire"
  }
}
/** A client's accounts as a whole against the band; below the band is a review of whether the client takes too little risk, not an unsuitability finding. */
export const wholeWords = (p: RiskPosture): string => (p.status === 'below' ? `${beyondWords(p)} · review whether too little risk` : beyondWords(p))
export const INTEGRATION_STATUS_TAG: Readonly<Record<IntegrationStatus, string>> = { synced: 'SYNCED', pending: 'PENDING', failed: 'FAILED' }
export const SEVERITY_WORDS: Readonly<Record<'low' | 'medium' | 'high', string>> = { low: 'Low', medium: 'Medium', high: 'High' }
export const MATCH_KIND_WORDS: Readonly<Record<MatchKind, string>> = { positions: 'Positions', valuations: 'Valuations', cash: 'Cash', transactions: 'Transaction streams' }
export const FREQUENCY_WORDS: Readonly<Record<string, string>> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-annual', annual: 'Annual', threshold_only: 'On threshold only',
}
export const BENCHMARK_KIND_WORDS: Readonly<Record<ModelBenchmark['kind'], string>> = {
  policy_blend: 'Policy blend', glide_path: "Glide path · today's stage targets", mandate: "The mandate's own benchmark",
}
export const SEGMENT_WORDS: Readonly<Record<string, string>> = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }

/** A record's word from a map, or an error naming the value the map does not hold. */
export function wordFor(map: Readonly<Record<string, string>>, key: string): string {
  const word = map[key]
  if (word === undefined) throw new Error(`No word for "${key}"`)
  return word
}

/** A model's pending version, if any, as the line beneath its current one. */
export const pendingVersionWords = (m: Pick<ModelSummary, 'pendingVersion'>) =>
  m.pendingVersion ? `v${m.pendingVersion.version} pending from ${fmtDayMonthYear(m.pendingVersion.effectiveDate)}` : undefined

/** "v2", or "v2 · v3 pending from 2026-04-01". */
export const versionWords = (m: Pick<ModelSummary, 'currentVersion' | 'pendingVersion'>) =>
  m.pendingVersion ? `v${m.currentVersion} · v${m.pendingVersion.version} pending from ${fmtDayMonthYear(m.pendingVersion.effectiveDate)}` : `v${m.currentVersion}`

/** A sleeve's name on the reference views: the commodities sleeve holds GLD and is measured by the LBMA gold price, so it is Gold. */
export const sleeveLabel = (assetClass: string) => (assetClass === 'commodities' ? 'Gold' : assetClassLabel(assetClass))
