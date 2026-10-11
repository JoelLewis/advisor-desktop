import type { TradableAssetClass } from '@/types/trading'
import { formatCurrency } from '@/lib/utils'

/**
 * The custodian's transaction charges, in USD. Re-homed from the retired trade ticket
 * (src/features/portfolios/trade-fields/shared.tsx) so the proposal's fee section and any future
 * order summary quote one schedule. Options are charged per contract and bonds per bond; the
 * other classes per trade.
 */
export const COMMISSION_USD: Readonly<Record<TradableAssetClass, number>> = {
  equity: 4.95,
  option: 0.65,
  mutual_fund: 0,
  fixed_income: 1.0,
  digital_asset: 0,
}

export function commissionSchedule(): string {
  return `${formatCurrency(COMMISSION_USD.equity)} per equity or ETF trade, ${formatCurrency(COMMISSION_USD.option)} per option contract and ${formatCurrency(COMMISSION_USD.fixed_income)} per bond`
}
