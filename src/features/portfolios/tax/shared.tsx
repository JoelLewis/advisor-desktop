/* eslint-disable react-refresh/only-export-components -- shared utility components + constants */
import { cn } from '@/lib/utils'
import { convertToBase } from '@/lib/currency'
import type { TaxLot } from '@/types/portfolio'
import type { CurrencyCode, FXRateMap } from '@/types/currency'

export const HOLDING_LABELS: Record<string, string> = { short: 'Short-Term', long: 'Long-Term' }

/**
 * C11 · tax-loss-harvesting — a flat 37% was applied to every lot and rendered directly beside a
 * "Long" holding-period badge. Long-term losses offset long-term gains at capital-gains rates.
 *
 * These are the top federal marginal rates and exclude state tax. The screen must say so.
 */
export const SHORT_TERM_RATE = 0.37 as const
/** 20% long-term capital gains + 3.8% net investment income tax. */
export const LONG_TERM_RATE = 0.238 as const

export const RATE_DISCLOSURE =
  'Estimated at top federal marginal rates — 37% short-term, 23.8% long-term including net ' +
  'investment income tax. State tax is not modelled. Estimates only, not tax advice.'

export function taxRateFor(holdingPeriod: TaxLot['holdingPeriod']): number {
  return holdingPeriod === 'short' ? SHORT_TERM_RATE : LONG_TERM_RATE
}

export function estimatedTaxBenefit(lot: Pick<TaxLot, 'gainLoss' | 'holdingPeriod'>): number {
  if (lot.gainLoss >= 0) return 0
  return Math.abs(lot.gainLoss) * taxRateFor(lot.holdingPeriod)
}

/**
 * PRE-FLIGHT correction 1 · the harvest threshold (`TaxManagementPage.tsx`) compared each lot's
 * native-currency `gainLoss` directly against a bare `-1000`, applied identically across acc-041
 * (HKD), acc-042 (SGD), acc-043 (EUR) and acc-044 (CHF). HK$1,000 is about US$128 and CHF 1,000
 * about US$1,120, so the same literal meant wildly different real losses per account. The
 * threshold is in USD; convert the lot to USD before comparing. Exported so Task 17 imports this
 * constant rather than hardcoding `-1000` a third time.
 */
export const HARVEST_LOSS_THRESHOLD_USD = -1000 as const

export function isHarvestable(gainLoss: number, currency: CurrencyCode, rates: FXRateMap): boolean {
  return convertToBase(gainLoss, currency, rates) < HARVEST_LOSS_THRESHOLD_USD
}

const TH_ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={cn('px-4 py-2.5 text-caption font-medium text-text-secondary', TH_ALIGN[align])}>
      {children}
    </th>
  )
}
