import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Scissors, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccount } from '@/hooks/use-accounts'
import { useTaxLots } from '@/hooks/use-tax-lots'
import { usePositions } from '@/hooks/use-portfolio'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { TaxLot } from '@/types/portfolio'

type ViewMode = 'lots' | 'harvest' | 'calendar'

const HOLDING_LABELS: Record<string, string> = { short: 'Short-Term', long: 'Long-Term' }

function getWashSaleEndDate(purchaseDate: string): string {
  const d = new Date(purchaseDate)
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export function TaxManagementPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const id = accountId ?? ''
  const [view, setView] = useState<ViewMode>('lots')
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set())

  const { data: account, isLoading: accountLoading } = useAccount(id)
  const { data: taxLots, isLoading: lotsLoading } = useTaxLots(id)
  const { data: positions } = usePositions(id)

  const isLoading = accountLoading || lotsLoading

  // Build position lookup for symbol display
  const positionMap = useMemo(() => {
    const map = new Map<string, { symbol: string; name: string }>()
    for (const p of positions ?? []) {
      map.set(p.id, { symbol: p.symbol, name: p.name })
    }
    return map
  }, [positions])

  // Harvest opportunities: lots with unrealized losses > $1,000
  const harvestOpportunities = useMemo(
    () => (taxLots ?? []).filter((lot) => lot.gainLoss < -1000).sort((a, b) => a.gainLoss - b.gainLoss),
    [taxLots],
  )

  // Tax summary stats
  const stats = useMemo(() => {
    if (!taxLots) return null
    const totalUnrealizedGain = taxLots.filter((l) => l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const totalUnrealizedLoss = taxLots.filter((l) => l.gainLoss < 0).reduce((s, l) => s + l.gainLoss, 0)
    const shortTermGain = taxLots.filter((l) => l.holdingPeriod === 'short' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const longTermGain = taxLots.filter((l) => l.holdingPeriod === 'long' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const harvestableAmount = harvestOpportunities.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
    const washSaleCount = taxLots.filter((l) => l.washSaleRestricted).length
    return { totalUnrealizedGain, totalUnrealizedLoss, shortTermGain, longTermGain, harvestableAmount, washSaleCount }
  }, [taxLots, harvestOpportunities])

  // Calendar: 30-day wash sale windows
  const washSaleWindows = useMemo(() => {
    const now = new Date('2026-02-25')
    return (taxLots ?? [])
      .filter((lot) => {
        const end = new Date(getWashSaleEndDate(lot.purchaseDate))
        return end >= now
      })
      .map((lot) => ({
        ...lot,
        washSaleEnd: getWashSaleEndDate(lot.purchaseDate),
        position: positionMap.get(lot.positionId),
      }))
      .sort((a, b) => a.washSaleEnd.localeCompare(b.washSaleEnd))
  }, [taxLots, positionMap])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!account) {
    return <div className="py-12 text-center text-text-tertiary">Account not found</div>
  }

  function toggleLot(lotId: string) {
    setSelectedLots((prev) => {
      const next = new Set(prev)
      if (next.has(lotId)) next.delete(lotId)
      else next.add(lotId)
      return next
    })
  }

  const selectedHarvestAmount = harvestOpportunities
    .filter((l) => selectedLots.has(l.id))
    .reduce((s, l) => s + Math.abs(l.gainLoss), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded p-1.5 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-page-title">Tax Management</h1>
          <p className="text-caption text-text-secondary">{account.name}</p>
        </div>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Unrealized Gains</p>
              <p className="font-mono text-section-header text-accent-green">{formatCurrency(stats.totalUnrealizedGain, true)}</p>
              <div className="mt-1 flex gap-3 text-caption">
                <span className="text-text-tertiary">ST: {formatCurrency(stats.shortTermGain, true)}</span>
                <span className="text-text-tertiary">LT: {formatCurrency(stats.longTermGain, true)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Unrealized Losses</p>
              <p className="font-mono text-section-header text-accent-red">{formatCurrency(stats.totalUnrealizedLoss, true)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Harvestable Losses</p>
              <p className="font-mono text-section-header text-accent-blue">{formatCurrency(stats.harvestableAmount, true)}</p>
              <p className="mt-1 text-caption text-text-tertiary">{harvestOpportunities.length} lot{harvestOpportunities.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Wash Sale Windows</p>
              <p className={cn('font-mono text-section-header', stats.washSaleCount > 0 ? 'text-amber-600' : 'text-accent-green')}>
                {washSaleWindows.length}
              </p>
              <p className="mt-1 text-caption text-text-tertiary">active in next 30d</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border-primary bg-surface-primary p-1">
        {([
          { id: 'lots' as const, label: 'All Tax Lots' },
          { id: 'harvest' as const, label: 'Harvest Scanner' },
          { id: 'calendar' as const, label: 'Wash Sale Calendar' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              'rounded-md px-4 py-1.5 text-caption font-medium transition-colors',
              view === tab.id
                ? 'bg-accent-blue text-white'
                : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tax Lots Table */}
      {view === 'lots' && (
        <Card>
          <CardHeader>Tax Lots ({taxLots?.length ?? 0})</CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
              <table className="w-full">
                <thead className="sticky top-0 bg-surface-primary">
                  <tr className="border-b border-border-primary">
                    <th className="px-4 py-2.5 text-left text-caption font-medium text-text-secondary">Symbol</th>
                    <th className="px-4 py-2.5 text-left text-caption font-medium text-text-secondary">Purchase Date</th>
                    <th className="px-4 py-2.5 text-left text-caption font-medium text-text-secondary">Holding</th>
                    <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Qty</th>
                    <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Cost Basis</th>
                    <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Current Value</th>
                    <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Gain/Loss</th>
                    <th className="px-4 py-2.5 text-center text-caption font-medium text-text-secondary">Wash Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {(taxLots ?? []).map((lot) => (
                    <TaxLotRow key={lot.id} lot={lot} positionMap={positionMap} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Harvest Scanner */}
      {view === 'harvest' && (
        <div className="space-y-4">
          {selectedLots.size > 0 && (
            <Card className="border-l-[3px] border-l-accent-blue">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-body-strong">{selectedLots.size} lot{selectedLots.size !== 1 ? 's' : ''} selected</p>
                  <p className="text-caption text-text-secondary">
                    Estimated tax savings: <span className="font-mono font-medium text-accent-green">{formatCurrency(selectedHarvestAmount * 0.37, true)}</span>
                    {' '}(at 37% rate)
                  </p>
                </div>
                <button className="flex items-center gap-1.5 rounded-md bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90">
                  <Scissors className="h-4 w-4" /> Execute Harvest <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader
              action={
                <Badge variant="blue">{harvestOpportunities.length} opportunities</Badge>
              }
            >
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-text-secondary" />
                Tax-Loss Harvesting Opportunities
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {harvestOpportunities.length === 0 ? (
                <div className="px-4 py-12 text-center text-text-tertiary">No harvest opportunities found (losses &gt; $1,000)</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="px-4 py-2.5 text-left text-caption font-medium text-text-secondary">Select</th>
                      <th className="px-4 py-2.5 text-left text-caption font-medium text-text-secondary">Symbol</th>
                      <th className="px-4 py-2.5 text-left text-caption font-medium text-text-secondary">Holding</th>
                      <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Qty</th>
                      <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Unrealized Loss</th>
                      <th className="px-4 py-2.5 text-right text-caption font-medium text-text-secondary">Est. Tax Savings</th>
                      <th className="px-4 py-2.5 text-center text-caption font-medium text-text-secondary">Wash Sale Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harvestOpportunities.map((lot) => {
                      const pos = positionMap.get(lot.positionId)
                      return (
                        <tr key={lot.id} className="border-b border-border-primary last:border-b-0 hover:bg-surface-tertiary/50">
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedLots.has(lot.id)}
                              onChange={() => toggleLot(lot.id)}
                              className="h-4 w-4 rounded border-border-secondary text-accent-blue"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-mono text-body-strong">{pos?.symbol ?? '—'}</p>
                            <p className="text-caption text-text-tertiary">{pos?.name ?? ''}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={lot.holdingPeriod === 'short' ? 'yellow' : 'default'}>
                              {HOLDING_LABELS[lot.holdingPeriod]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">{lot.quantity.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-accent-red">{formatCurrency(lot.gainLoss)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-accent-green">{formatCurrency(Math.abs(lot.gainLoss) * 0.37)}</td>
                          <td className="px-4 py-2.5 text-center">
                            {lot.washSaleRestricted ? (
                              <Badge variant="red">Restricted</Badge>
                            ) : (
                              <Badge variant="green">Clear</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wash Sale Calendar */}
      {view === 'calendar' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-secondary" />
              30-Day Wash Sale Windows
            </div>
          </CardHeader>
          <CardContent>
            {washSaleWindows.length === 0 ? (
              <div className="py-12 text-center text-text-tertiary">No active wash sale windows</div>
            ) : (
              <div className="space-y-3">
                {washSaleWindows.map((item) => {
                  const daysRemaining = Math.max(0, Math.ceil(
                    (new Date(item.washSaleEnd).getTime() - new Date('2026-02-25').getTime()) / (1000 * 60 * 60 * 24),
                  ))
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between rounded-md border px-4 py-3',
                        daysRemaining <= 7 ? 'border-amber-300 bg-amber-50' : 'border-border-primary',
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {daysRemaining <= 7 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        <div>
                          <p className="font-mono text-body-strong">{item.position?.symbol ?? 'Unknown'}</p>
                          <p className="text-caption text-text-tertiary">
                            Purchased {formatDate(item.purchaseDate)} &middot; {item.quantity.toLocaleString()} shares
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-caption text-text-secondary">
                          Window ends {formatDate(item.washSaleEnd)}
                        </p>
                        <p className={cn(
                          'font-mono text-caption font-medium',
                          daysRemaining <= 7 ? 'text-amber-600' : 'text-text-tertiary',
                        )}>
                          {daysRemaining}d remaining
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TaxLotRow({
  lot,
  positionMap,
}: {
  lot: TaxLot
  positionMap: Map<string, { symbol: string; name: string }>
}) {
  const pos = positionMap.get(lot.positionId)
  return (
    <tr className="border-b border-border-primary last:border-b-0 hover:bg-surface-tertiary/50">
      <td className="px-4 py-2.5">
        <p className="font-mono text-body-strong">{pos?.symbol ?? '—'}</p>
        <p className="text-caption text-text-tertiary">{pos?.name ?? ''}</p>
      </td>
      <td className="px-4 py-2.5 font-mono text-caption text-text-secondary">{formatDate(lot.purchaseDate)}</td>
      <td className="px-4 py-2.5">
        <Badge variant={lot.holdingPeriod === 'short' ? 'yellow' : 'default'}>
          {HOLDING_LABELS[lot.holdingPeriod]}
        </Badge>
      </td>
      <td className="px-4 py-2.5 text-right font-mono">{lot.quantity.toLocaleString()}</td>
      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(lot.costBasis, true)}</td>
      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(lot.currentValue, true)}</td>
      <td className={cn('px-4 py-2.5 text-right font-mono', lot.gainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
        {formatCurrency(lot.gainLoss, true)}
      </td>
      <td className="px-4 py-2.5 text-center">
        {lot.washSaleRestricted ? (
          <Badge variant="red">Yes</Badge>
        ) : (
          <span className="text-caption text-text-tertiary">No</span>
        )}
      </td>
    </tr>
  )
}
