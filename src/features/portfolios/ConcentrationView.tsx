import { AlertTriangle, PieChart } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TreemapChart } from '@/components/ui/TreemapChart'
import { useConcentration } from '@/hooks/use-portfolio'
import { useContainerWidth } from '@/hooks/use-container-width'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity',
  intl_equity: 'Intl Equity',
  emerging_markets: 'EM',
  fixed_income: 'Fixed Income',
  alternatives: 'Alts',
  real_estate: 'Real Estate',
  commodities: 'Commodities',
  cash: 'Cash',
  digital_assets: 'Digital Assets',
  private_equity: 'Private Equity',
}

type ConcentrationViewProps = {
  accountId: string
}

export function ConcentrationView({ accountId }: ConcentrationViewProps) {
  const { formatWithConversion } = useFormatCurrency()
  const { data, isLoading } = useConcentration(accountId)
  const { containerRef: treemapContainerRef, width: treemapWidth } = useContainerWidth(720)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[440px]" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <PieChart className="mb-2 h-8 w-8" />
        <p>No concentration data available</p>
      </div>
    )
  }

  const { positions, summary } = data
  const breachCount = summary.breachCount
  const topPositions = positions.filter((p) => p.weight > 0.02)

  const treemapData = positions.map((p) => ({
    id: p.positionId,
    label: p.symbol,
    sublabel: p.assetClass,
    value: p.marketValue,
    weight: p.weight,
    breached: p.breached,
  }))

  return (
    <div className="space-y-6">
      {/* Breach warning banner */}
      {breachCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-body text-amber-800">
            {breachCount} position{breachCount > 1 ? 's' : ''} exceed{breachCount === 1 ? 's' : ''} IPS concentration limits
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <p className="text-caption text-text-secondary">Top 10 Concentration</p>
            <p className="font-mono text-section-header">
              {(summary.top10Weight * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-text-secondary">HHI (Herfindahl)</p>
            <p className="font-mono text-section-header">
              {summary.herfindahlIndex.toFixed(4)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-text-secondary">IPS Breaches</p>
            <p
              className={cn(
                'font-mono text-section-header',
                breachCount > 0 ? 'text-accent-red' : 'text-accent-green',
              )}
            >
              {breachCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-text-secondary">Total Positions</p>
            <p className="font-mono text-section-header">{summary.totalPositions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Treemap */}
      <Card>
        <CardHeader>Position Concentration</CardHeader>
        <CardContent>
          <div ref={treemapContainerRef}>
            <TreemapChart data={treemapData} width={treemapWidth} height={Math.round(treemapWidth * 0.6)} />
          </div>
        </CardContent>
      </Card>

      {/* Concentration limits table */}
      <Card>
        <CardHeader>Concentration Limits</CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary text-left">
                <th className="px-4 py-2.5 text-caption font-medium text-text-secondary">Symbol</th>
                <th className="px-4 py-2.5 text-caption font-medium text-text-secondary">Name</th>
                <th className="px-4 py-2.5 text-caption font-medium text-text-secondary">Asset Class</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Market Value</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Weight</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Limit</th>
                <th className="px-4 py-2.5 text-center text-caption font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {topPositions.map((p) => (
                <tr
                  key={p.positionId}
                  className={cn(
                    'border-b border-border-primary last:border-b-0',
                    p.breached && 'border-l-[3px] border-l-accent-red',
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-body-strong">{p.symbol}</td>
                  <td className="px-4 py-2.5 text-body text-text-secondary">{p.name}</td>
                  <td className="px-4 py-2.5 text-caption text-text-secondary">
                    {ASSET_CLASS_LABELS[p.assetClass] ?? p.assetClass}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatWithConversion(p.marketValue, 'USD', { compact: true })}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{(p.weight * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono">{(p.limit * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center">
                    {p.breached ? (
                      <Badge variant="red">Breach</Badge>
                    ) : (
                      <Badge variant="green">OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {topPositions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-tertiary">
                    No positions above 2% weight
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
