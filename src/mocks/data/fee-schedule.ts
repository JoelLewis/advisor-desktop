import { proposalTemplates, toFeeTiers } from './proposals'
import { blendedTieredFee, type FeeTier } from '@/lib/fees'

/** The firm's one published schedule, the one Form ADV Part 2A discloses. Billing and the prospect proposal both price on it. */
export const FIRM_FEE_SCHEDULE_ID = 'tpl-001'

function firmSchedule(): { name: string; tiers: readonly FeeTier[] } {
  const template = proposalTemplates.find((t) => t.id === FIRM_FEE_SCHEDULE_ID)
  if (!template) throw new Error(`The firm's fee schedule ${FIRM_FEE_SCHEDULE_ID} is missing`)
  return { name: template.name, tiers: toFeeTiers(template.feeTiers) }
}

export const FIRM_FEE_SCHEDULE = firmSchedule()

/** The one derivation of a fee on the firm's schedule: the annual fee and the blended rate it implies. */
export const feeOn = (value: number): { fee: number; blendedRate: number } => blendedTieredFee(value, FIRM_FEE_SCHEDULE.tiers)
