import type { ResidualDriftReason } from '@/services/oms'

/**
 * Why an asset class remains away from target after the trades, in a phrase that fits a table
 * cell. Each phrase states what the engine's reason means (see `residualReason` and the
 * generator's held-back constraints), not a guess at it.
 */
export const RESIDUAL_WORDS: Readonly<Record<ResidualDriftReason, string>> = {
  not_market_tradable: 'no market to sell into',
  cash_capped: "held to the model's cash target",
  replacement_hold: 'harvest replacement inside its hold',
  below_lot_size: 'less than one tradable unit away',
  excluded_by_constraint: 'excluded from this proposal',
  harvest_only: 'harvest only: gain lots left unsold',
  gains_capped: 'held back by the gains cap',
  wash_sale_avoided: 'a buy that would wash a loss was skipped',
}
