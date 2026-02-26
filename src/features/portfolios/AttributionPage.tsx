import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { WaterfallChart } from '@/components/ui/WaterfallChart'
import { useAttribution } from '@/hooks/use-portfolio'
import { useAccount } from '@/hooks/use-accounts'
import { formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { AttributionResult } from '@/types/performance'

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity', intl_equity: 'Intl Equity', emerging_markets: 'EM',
  fixed_income: 'Fixed Income', alternatives: 'Alts', real_estate: 'Real Estate',
  commodities: 'Commodities', cash: 'Cash', digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

const PERIODS = [
  { id: 'mtd', label: 'MTD' },
  { id: 'qtd', label: 'QTD' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
] as const

function sumField(data: AttributionResult[], field: 'allocation' | 'selection' | 'total'): number {
  return data.reduce((sum, row) => sum + row[field], 0)
}

export function AttributionPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const id = accountId ?? ''
  const [period, setPeriod] = useState<string>('ytd')

  const { data: account, isLoading: accountLoading } = useAccount(id)
  const { data: attribution, isLoading: attributionLoading } = useAttribution(id, period)

  const isLoading = accountLoading || attributionLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80" />
        <div className="grid grid-cols-3 gap-4">
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

  const waterfallData = (attribution ?? []).map((a) => ({
    label: ASSET_CLASS_LABELS[a.assetClass] ?? a.assetClass,
    value: a.total,
  }))

  const totalAllocation = sumField(attribution ?? [], 'allocation')
  const totalSelection = sumField(attribution ?? [], 'selection')
  const totalActive = sumField(attribution ?? [], 'total')

  return (
    <div className="space-y-6">
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
          {waterfallData.length > 0 ? (
            <WaterfallChart data={waterfallData} />
          ) : (
            <p className="py-8 text-center text-text-tertiary">No attribution data available</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total Allocation Effect" value={totalAllocation} />
        <SummaryCard label="Total Selection Effect" value={totalSelection} />
        <SummaryCard label="Total Active Return" value={totalActive} />
      </div>

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
              {(attribution ?? []).map((row) => (
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
              {(attribution ?? []).length === 0 && (
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
          {formatPercent(value * 100)}
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
      {formatPercent(value * 100)}
    </span>
  )
}
