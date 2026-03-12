import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'

type TaxStats = {
  totalUnrealizedGain: number
  totalUnrealizedLoss: number
  shortTermGain: number
  longTermGain: number
  harvestableAmount: number
  washSaleCount: number
}

type TaxSummaryCardsProps = {
  stats: TaxStats
  washSaleWindowsCount: number
  harvestOpportunitiesLength: number
  formatWithConversion: (value: number, currency: CurrencyCode, opts?: { compact?: boolean }) => string
  baseCurrency: CurrencyCode
}

export function TaxSummaryCards({
  stats,
  washSaleWindowsCount,
  harvestOpportunitiesLength,
  formatWithConversion,
  baseCurrency,
}: TaxSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Unrealized Gains</p>
          <p className="font-mono text-section-header text-accent-green">{formatWithConversion(stats.totalUnrealizedGain, baseCurrency, { compact: true })}</p>
          <div className="mt-1 flex gap-3 text-caption">
            <span className="text-text-tertiary">ST: {formatWithConversion(stats.shortTermGain, baseCurrency, { compact: true })}</span>
            <span className="text-text-tertiary">LT: {formatWithConversion(stats.longTermGain, baseCurrency, { compact: true })}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Unrealized Losses</p>
          <p className="font-mono text-section-header text-accent-red">{formatWithConversion(stats.totalUnrealizedLoss, baseCurrency, { compact: true })}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Harvestable Losses</p>
          <p className="font-mono text-section-header text-accent-blue">{formatWithConversion(stats.harvestableAmount, baseCurrency, { compact: true })}</p>
          <p className="mt-1 text-caption text-text-tertiary">{harvestOpportunitiesLength} lot{harvestOpportunitiesLength !== 1 ? 's' : ''}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-caption text-text-secondary">Wash Sale Windows</p>
          <p className={cn('font-mono text-section-header', stats.washSaleCount > 0 ? 'text-amber-600' : 'text-accent-green')}>
            {washSaleWindowsCount}
          </p>
          <p className="mt-1 text-caption text-text-tertiary">active in next 30d</p>
        </CardContent>
      </Card>
    </div>
  )
}
