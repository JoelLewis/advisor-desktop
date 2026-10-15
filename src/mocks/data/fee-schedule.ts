import type { ProposalFeeTier } from '@/types/proposal'
import { blendedTieredFee, type FeeTier } from '@/lib/fees'

/**
 * The firm's one published schedule, the one Form ADV Part 2A discloses. Billing, the prospect proposal and
 * every proposal template's fee section price on it (two legacy templates once carried schedules of
 * their own, 1.00/0.80/0.65% and 0.95/0.75/0.60%, that the ADV does not disclose).
 */
const PUBLISHED_TIERS: readonly ProposalFeeTier[] = [
  { minAUM: 0, maxAUM: 2_000_000, rate: 0.0100, label: '$0 – $2M' },
  { minAUM: 2_000_000, maxAUM: 5_000_000, rate: 0.0085, label: '$2M – $5M' },
  { minAUM: 5_000_000, maxAUM: 10_000_000, rate: 0.0070, label: '$5M – $10M' },
  { minAUM: 10_000_000, maxAUM: null, rate: 0.0050, label: '$10M+' },
]

/**
 * `blendedTieredFee` takes `{ upTo, rate }`; the published tiers carry `{ minAUM, maxAUM, rate, label }`.
 * `upTo` is exactly `maxAUM`: the tiers are contiguous from 0, so `minAUM` and `label` carry nothing the fee needs.
 */
function toFeeTiers(tiers: readonly ProposalFeeTier[]): FeeTier[] {
  return tiers.map((t) => ({ upTo: t.maxAUM, rate: t.rate }))
}

export const FIRM_FEE_SCHEDULE: { name: string; published: readonly ProposalFeeTier[]; tiers: readonly FeeTier[] } = {
  name: 'Comprehensive Wealth Management',
  published: PUBLISHED_TIERS,
  tiers: toFeeTiers(PUBLISHED_TIERS),
}

/** The one derivation of a fee on the firm's schedule: the annual fee and the blended rate it implies. */
export const feeOn = (value: number): { fee: number; blendedRate: number } => blendedTieredFee(value, FIRM_FEE_SCHEDULE.tiers)
