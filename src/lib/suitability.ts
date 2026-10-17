import { fmtPoints } from '@/kit/measure'

/** Why an advisor approves a model above the client's tolerance. One is chosen; a note may add to it. Shared by the engine and the UI. */
export const SUITABILITY_REASONS = ['ips_permits_growth', 'client_acknowledged_risk', 'accounts_within_tolerance'] as const

export type SuitabilityReasonId = (typeof SUITABILITY_REASONS)[number]
/** What the advisor sends: the reason chosen and, if written, a note. */
export type SuitabilityReason = { reason: SuitabilityReasonId; note?: string }
/** Where the client's accounts as a whole sit after the proposal, against the client's tolerance band. */
export type WholeFigure = { score: number; toleranceBand: string; floor: number; ceiling: number }
/**
 * The reason as the engine records it: the client it was judged for, and, with the accounts-as-a-whole reason,
 * the figure that reason rests on, taken from the version's pre-trade check rather than from the request.
 */
export type RecordedSuitability = SuitabilityReason & { clientName: string; whole?: WholeFigure }
export const SUITABILITY_NOTE_MAX = 500

export const isSuitabilityReasonId = (v: unknown): v is SuitabilityReasonId => SUITABILITY_REASONS.some((r) => r === v)

/** The reason in words. The accounts-as-a-whole reason names the client: suitability is judged per client, on that client's own accounts. */
export function reasonLabel(reason: SuitabilityReasonId, clientName: string): string {
  switch (reason) {
    case 'ips_permits_growth': return 'The IPS permits a growth allocation for this account'
    case 'client_acknowledged_risk': return 'Client acknowledged the higher risk in writing'
    case 'accounts_within_tolerance': return `${clientName}'s accounts as a whole stay within tolerance (asset location)`
  }
}

const pts = (n: number) => `${fmtPoints(n)} pts`
/** The band as the pre-trade check writes it: "Moderate, 41–55 pts". */
export const bandText = ({ toleranceBand, floor, ceiling }: Omit<WholeFigure, 'score'>): string => `${toleranceBand}, ${fmtPoints(floor)}–${pts(ceiling)}`

/** The figure the accounts-as-a-whole reason rests on: "46 pts after this proposal, within Moderate, 41–55 pts". */
const wholeFigureText = (whole: WholeFigure): string => `${pts(whole.score)} after this proposal, within ${bandText(whole)}`

/** The reason with its figure and note: "<reason>[ · <figure>][ · <note>]". */
export function suitabilityText({ reason, note, clientName, whole }: RecordedSuitability): string {
  return [reasonLabel(reason, clientName), ...(whole ? [wholeFigureText(whole)] : []), ...(note ? [note] : [])].join(' · ')
}

/** The reason as the record states it: "Suitability reason · <reason>[ · <figure>][ · <note>]". */
export const suitabilityLine = (recorded: RecordedSuitability): string => `Suitability reason · ${suitabilityText(recorded)}`
