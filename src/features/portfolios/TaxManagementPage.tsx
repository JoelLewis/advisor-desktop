import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Scissors, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccount } from '@/hooks/use-accounts'
import { useTaxLots } from '@/hooks/use-tax-lots'
import { usePositions } from '@/hooks/use-portfolio'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { formatDate, cn } from '@/lib/utils'
import type { TaxLot } from '@/types/portfolio'
import type { CurrencyCode } from '@/types/currency'

type ViewMode = 'lots' | 'harvest' | 'calendar'

const COST_BASIS_METHODS = ['FIFO', 'LIFO', 'HIFO', 'AvgCost', 'SpecID'] as const
type CostBasisMethod = (typeof COST_BASIS_METHODS)[number]

const COST_BASIS_DESCRIPTIONS: Record<CostBasisMethod, string> = {
  FIFO: 'First In, First Out — sells oldest lots first',
  LIFO: 'Last In, First Out — sells newest lots first',
  HIFO: 'Highest In, First Out — sells highest cost lots first (minimizes gains)',
  AvgCost: 'Average Cost — uses average cost basis across all lots',
  SpecID: 'Specific Identification — manually select which lots to sell',
}

const HOLDING_LABELS: Record<string, string> = { short: 'Short-Term', long: 'Long-Term' }

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'lots', label: 'All Tax Lots' },
  { id: 'harvest', label: 'Harvest Scanner' },
  { id: 'calendar', label: 'Wash Sale Calendar' },
]

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
  const [costBasisMethod, setCostBasisMethod] = useState<CostBasisMethod>('FIFO')

  const { data: account, isLoading: accountLoading } = useAccount(id)
  const { data: taxLots, isLoading: lotsLoading } = useTaxLots(id)
  const { data: positions } = usePositions(id)
  const { formatWithConversion } = useFormatCurrency()

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

  // Cost basis method impact simulation
  const methodImpact = useMemo(() => {
    if (!taxLots || taxLots.length === 0) return null
    // Group lots by position
    const byPosition = new Map<string, TaxLot[]>()
    for (const lot of taxLots) {
      const existing = byPosition.get(lot.positionId) ?? []
      existing.push(lot)
      byPosition.set(lot.positionId, existing)
    }

    // Simulate selling 10% of each position under each method
    function computeImpact(method: CostBasisMethod): { realizedGain: number; shortTermGain: number; longTermGain: number } {
      let totalGain = 0, stGain = 0, ltGain = 0
      for (const [, lots] of byPosition) {
        const totalQty = lots.reduce((s, l) => s + l.quantity, 0)
        const sellQty = Math.ceil(totalQty * 0.1)
        let sorted: TaxLot[]
        switch (method) {
          case 'FIFO': sorted = [...lots].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate)); break
          case 'LIFO': sorted = [...lots].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)); break
          case 'HIFO': sorted = [...lots].sort((a, b) => (b.costBasis / b.quantity) - (a.costBasis / a.quantity)); break
          case 'AvgCost': sorted = lots; break // all lots treated equally
          case 'SpecID': sorted = [...lots].sort((a, b) => a.gainLoss - b.gainLoss); break // best lots first
        }
        let remaining = sellQty
        for (const lot of sorted) {
          if (remaining <= 0) break
          const sellFromLot = Math.min(remaining, lot.quantity)
          const fraction = sellFromLot / lot.quantity
          const gain = lot.gainLoss * fraction
          totalGain += gain
          if (lot.holdingPeriod === 'short') stGain += gain
          else ltGain += gain
          remaining -= sellFromLot
        }
      }
      return { realizedGain: totalGain, shortTermGain: stGain, longTermGain: ltGain }
    }

    return COST_BASIS_METHODS.map((method) => ({
      method,
      ...computeImpact(method),
    }))
  }, [taxLots])

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
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Unrealized Gains</p>
              <p className="font-mono text-section-header text-accent-green">{formatWithConversion(stats.totalUnrealizedGain, account.baseCurrency ?? 'USD', { compact: true })}</p>
              <div className="mt-1 flex gap-3 text-caption">
                <span className="text-text-tertiary">ST: {formatWithConversion(stats.shortTermGain, account.baseCurrency ?? 'USD', { compact: true })}</span>
                <span className="text-text-tertiary">LT: {formatWithConversion(stats.longTermGain, account.baseCurrency ?? 'USD', { compact: true })}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Unrealized Losses</p>
              <p className="font-mono text-section-header text-accent-red">{formatWithConversion(stats.totalUnrealizedLoss, account.baseCurrency ?? 'USD', { compact: true })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Harvestable Losses</p>
              <p className="font-mono text-section-header text-accent-blue">{formatWithConversion(stats.harvestableAmount, account.baseCurrency ?? 'USD', { compact: true })}</p>
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

      {/* Cost Basis Method */}
      <Card>
        <CardHeader>Cost Basis Method</CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={costBasisMethod}
              onChange={(e) => setCostBasisMethod(e.target.value as CostBasisMethod)}
              className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-none"
            >
              {COST_BASIS_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-caption text-text-secondary">
              {COST_BASIS_DESCRIPTIONS[costBasisMethod]}
            </span>
          </div>

          {/* Impact comparison table */}
          {methodImpact && (
            <div className="overflow-x-auto">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-border-primary text-text-tertiary">
                    <th className="px-3 py-2 text-left font-medium">Method</th>
                    <th className="px-3 py-2 text-right font-medium">Realized Gain/Loss</th>
                    <th className="px-3 py-2 text-right font-medium">Short-Term</th>
                    <th className="px-3 py-2 text-right font-medium">Long-Term</th>
                  </tr>
                </thead>
                <tbody>
                  {methodImpact.map((row) => (
                    <tr
                      key={row.method}
                      className={cn(
                        'border-b border-border-primary transition-colors',
                        row.method === costBasisMethod
                          ? 'bg-accent-blue/5 font-medium'
                          : 'hover:bg-surface-tertiary',
                      )}
                    >
                      <td className="px-3 py-2 text-text-primary">
                        {row.method}
                        {row.method === costBasisMethod && (
                          <Badge variant="blue" className="ml-2 text-[9px]">Active</Badge>
                        )}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono', row.realizedGain >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                        {formatWithConversion(row.realizedGain, account.baseCurrency ?? 'USD', { compact: true })}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono', row.shortTermGain >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                        {formatWithConversion(row.shortTermGain, account.baseCurrency ?? 'USD', { compact: true })}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono', row.longTermGain >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                        {formatWithConversion(row.longTermGain, account.baseCurrency ?? 'USD', { compact: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-text-tertiary">
                Impact simulated on hypothetical 10% position reduction across all holdings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border-primary bg-surface-primary p-1">
        {VIEW_TABS.map((tab) => (
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
                    <Th>Symbol</Th>
                    <Th>Purchase Date</Th>
                    <Th>Holding</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Cost Basis</Th>
                    <Th align="right">Current Value</Th>
                    <Th align="right">Gain/Loss</Th>
                    <Th align="center">Wash Sale</Th>
                  </tr>
                </thead>
                <tbody>
                  {(taxLots ?? []).map((lot) => (
                    <TaxLotRow key={lot.id} lot={lot} positionMap={positionMap} baseCurrency={account.baseCurrency ?? 'USD'} />
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
                    Estimated tax savings: <span className="font-mono font-medium text-accent-green">{formatWithConversion(selectedHarvestAmount * 0.37, account.baseCurrency ?? 'USD', { compact: true })}</span>
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
                      <Th>Select</Th>
                      <Th>Symbol</Th>
                      <Th>Holding</Th>
                      <Th align="right">Qty</Th>
                      <Th align="right">Unrealized Loss</Th>
                      <Th align="right">Est. Tax Savings</Th>
                      <Th align="center">Wash Sale Risk</Th>
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
                          <td className="px-4 py-2.5 text-right font-mono text-accent-red"><CurrencyValue value={lot.gainLoss} from={account.baseCurrency ?? 'USD'} /></td>
                          <td className="px-4 py-2.5 text-right font-mono text-accent-green"><CurrencyValue value={Math.abs(lot.gainLoss) * 0.37} from={account.baseCurrency ?? 'USD'} /></td>
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

const TH_ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={cn('px-4 py-2.5 text-caption font-medium text-text-secondary', TH_ALIGN[align])}>
      {children}
    </th>
  )
}

function TaxLotRow({
  lot,
  positionMap,
  baseCurrency,
}: {
  lot: TaxLot
  positionMap: Map<string, { symbol: string; name: string }>
  baseCurrency: CurrencyCode
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
      <td className="px-4 py-2.5 text-right font-mono"><CurrencyValue value={lot.costBasis} from={baseCurrency} compact /></td>
      <td className="px-4 py-2.5 text-right font-mono"><CurrencyValue value={lot.currentValue} from={baseCurrency} compact /></td>
      <td className={cn('px-4 py-2.5 text-right font-mono', lot.gainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
        <CurrencyValue value={lot.gainLoss} from={baseCurrency} compact />
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
