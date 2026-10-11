import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'

type TaxStats = {
  totalUnrealizedGain: number
  totalUnrealizedLoss: number
  shortTermGain: number
  longTermGain: number
  harvestableAmount: number
  harvestableLotCount: number
  /** Harvest candidates left out of the figures above because selling them now would wash. */
  washingLotCount: number
  estimatedBenefit: number
}

type TaxSummaryCardsProps = {
  stats: TaxStats
  washSaleWindowsCount: number
  /**
   * Fix-round-2 review, Important #2 — while FX rates are unavailable, `harvestOpportunities`
   * fails open to `[]` (correctly — see TaxManagementPage), but rendering that as "$0.00 / 0
   * lots" presents an unknown as a measured fact. The exact defect class Phase 1 removes
   * elsewhere: a confident number standing in for "we don't actually know." When true, the
   * harvestable-losses card reads as unknown instead of zero.
   */
  harvestUnavailable?: boolean
  formatWithConversion: (value: number, currency: CurrencyCode, opts?: { compact?: boolean }) => string
  baseCurrency: CurrencyCode
}

export function TaxSummaryCards({
  stats,
  washSaleWindowsCount,
  harvestUnavailable = false,
  formatWithConversion,
  baseCurrency,
}: TaxSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Unrealized gains</p>
          <p className="font-mono text-section-header text-accent-green">{formatWithConversion(stats.totalUnrealizedGain, baseCurrency, { compact: true })}</p>
          <div className="mt-1 flex gap-3 text-caption">
            <span className="text-text-tertiary">ST: {formatWithConversion(stats.shortTermGain, baseCurrency, { compact: true })}</span>
            <span className="text-text-tertiary">LT: {formatWithConversion(stats.longTermGain, baseCurrency, { compact: true })}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Unrealized losses</p>
          <p className="font-mono text-section-header text-accent-red">{formatWithConversion(stats.totalUnrealizedLoss, baseCurrency, { compact: true })}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Harvestable losses</p>
          {harvestUnavailable ? (
            <>
              <p className="font-mono text-section-header text-text-tertiary">—</p>
              <p className="mt-1 text-caption text-text-tertiary">Exchange rates unavailable</p>
            </>
          ) : (
            <>
              <p className="font-mono text-section-header text-accent-blue">{formatWithConversion(stats.harvestableAmount, baseCurrency, { compact: true })}</p>
              <p className="mt-1 text-caption text-text-tertiary">{stats.harvestableLotCount} lot{stats.harvestableLotCount !== 1 ? 's' : ''}</p>
              {stats.washingLotCount > 0 && (
                <p className="mt-1 text-caption text-text-tertiary">{stats.washingLotCount} excluded: sale would wash</p>
              )}
              <p className="mt-1 text-caption text-text-tertiary">
                Est. tax benefit{' '}
                <span data-testid="estimated-tax-benefit" className="font-mono font-medium text-accent-green">
                  {formatWithConversion(stats.estimatedBenefit, baseCurrency, { compact: true })}
                </span>
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Wash sale windows</p>
          <p className={cn('font-mono text-section-header', washSaleWindowsCount > 0 ? 'text-amber-600' : 'text-accent-green')}>
            {washSaleWindowsCount}
          </p>
          <p className="mt-1 text-caption text-text-tertiary">open, household-wide</p>
        </CardContent>
      </Card>
    </div>
  )
}
