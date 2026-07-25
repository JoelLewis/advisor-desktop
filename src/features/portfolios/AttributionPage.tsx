import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { WaterfallChart } from '@/components/ui/WaterfallChart'
import { useAttribution } from '@/hooks/use-portfolio'
import { useAccount } from '@/hooks/use-accounts'
import { useContainerWidth } from '@/hooks/use-container-width'
import { formatPercent, formatDate, cn } from '@/lib/utils'

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity', intl_equity: 'Intl Equity', emerging_markets: 'EM',
  fixed_income: 'Fixed Income', alternatives: 'Alts', real_estate: 'Real Estate',
  commodities: 'Commodities', cash: 'Cash', digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

/**
 * The effects are published on a 1e-6 grid in return space and are single-basis-point quantities
 * on a short window, so they are rendered at the precision the API publishes rather than rounded
 * to two decimal places. Rounding each figure independently is what stops the four cards adding
 * up on screen — at two decimals acc-001's year-to-date cards read 0.06 + 0.04 + 0.00 against a
 * total of 0.11 — which loses the interaction effect in the last digit having just restored it.
 */
const EFFECT_DECIMALS = 4

const PERIODS = [
  { id: 'mtd', label: 'MTD' },
  { id: 'qtd', label: 'QTD' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
] as const

export function AttributionPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const id = accountId ?? ''
  const [period, setPeriod] = useState<string>('ytd')

  const { data: account, isLoading: accountLoading } = useAccount(id)
  const { data: attribution, isLoading: attributionLoading } = useAttribution(id, period)
  const { containerRef: chartContainerRef, width: chartWidth } = useContainerWidth(720)

  const isLoading = accountLoading || attributionLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80" />
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!account) {
    return <div className="py-12 text-center text-text-tertiary">Account not found</div>
  }

  // The totals come from the server, which sums the same rounded rows the table renders. Summing
  // them again here is how the interaction effect went missing from the cards in the first place.
  const rows = attribution?.rows ?? []
  const totals = attribution?.totals ?? { allocation: 0, selection: 0, interaction: 0, total: 0 }
  const waterfallData = rows.map((a) => ({
    label: ASSET_CLASS_LABELS[a.assetClass] ?? a.assetClass,
    value: a.total,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-page-title">Performance Attribution</h1>
          <p className="text-caption text-text-secondary">{account.name}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-1 rounded-lg border border-border-primary bg-surface-primary p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              'rounded-md px-4 py-1.5 text-caption font-medium transition-colors',
              period === p.id
                ? 'bg-accent-blue text-white'
                : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Waterfall Chart */}
      <Card>
        <CardHeader>Attribution by Asset Class</CardHeader>
        <CardContent>
          <div ref={chartContainerRef}>
            {waterfallData.length > 0 ? (
              <WaterfallChart data={waterfallData} width={chartWidth} height={Math.round(chartWidth * 0.5)} />
            ) : (
              <p className="py-8 text-center text-text-tertiary">No attribution data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <SummaryCard label="Allocation effect" value={totals.allocation} />
        <SummaryCard label="Selection effect" value={totals.selection} />
        <SummaryCard label="Interaction effect" value={totals.interaction} />
        <SummaryCard label="Total active return" value={totals.total} />
      </div>
      <p className="text-caption text-text-tertiary">
        {attribution?.model}, {attribution?.linking}. Benchmark: {attribution?.benchmark}.{' '}
        {attribution?.basis === 'gross of fees' ? 'Gross of fees.' : 'Net of fees.'} As of{' '}
        {attribution ? formatDate(attribution.asOf) : '—'}. Allocation is measured against the
        benchmark&rsquo;s total return, so overweighting a class helps only where that class beat
        the benchmark overall. Allocation plus selection plus interaction equals total active
        return. Sub-period figures are compounded from annual returns; they are not geometrically
        linked across sub-periods.
      </p>

      {/* Attribution Breakdown Table */}
      <Card>
        <CardHeader>Attribution Breakdown</CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="px-4 py-3 text-left text-caption font-medium text-text-secondary">Asset Class</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-text-secondary">Allocation</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-text-secondary">Selection</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-text-secondary">Interaction</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-text-secondary">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.assetClass} className="border-b border-border-primary last:border-b-0 hover:bg-surface-tertiary/50">
                  <td className="px-4 py-3 text-body-strong">
                    {ASSET_CLASS_LABELS[row.assetClass] ?? row.assetClass}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumericCell value={row.allocation} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumericCell value={row.selection} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumericCell value={row.interaction} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumericCell value={row.total} bold />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                    No attribution data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-caption text-text-secondary">{label}</p>
        <p className={cn('mt-1 font-mono text-section-header', value >= 0 ? 'text-accent-green' : 'text-accent-red')}>
          {formatPercent(value * 100, EFFECT_DECIMALS)}
        </p>
      </CardContent>
    </Card>
  )
}

function NumericCell({ value, bold = false }: { value: number; bold?: boolean }) {
  return (
    <span
      className={cn(
        'font-mono',
        value >= 0 ? 'text-accent-green' : 'text-accent-red',
        bold && 'font-medium',
      )}
    >
      {formatPercent(value * 100, EFFECT_DECIMALS)}
    </span>
  )
}
