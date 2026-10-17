import type { SuitabilityReason } from '@/lib/suitability'

/** Robert Johnson's accounts as a whole sit within his tolerance after the proposal, so this is the reason the panel offers him first. */
export const JOHNSON_REASON: SuitabilityReason = { reason: 'accounts_within_tolerance' }
