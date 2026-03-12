import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { QueryErrorBanner } from '@/components/ui/QueryErrorBanner'
import { useAccount } from '@/hooks/use-accounts'
import { useTaxLots } from '@/hooks/use-tax-lots'
import { usePositions } from '@/hooks/use-portfolio'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { TaxLot } from '@/types/portfolio'
import { MOCK_NOW } from './tax/shared'
import { COST_BASIS_METHODS, type CostBasisMethod } from './tax/CostBasisMethodCard'
import { TaxSummaryCards } from './tax/TaxSummaryCards'
import { CostBasisMethodCard } from './tax/CostBasisMethodCard'
import { TaxLotsView } from './tax/TaxLotsView'
import { HarvestScannerView } from './tax/HarvestScannerView'
import { WashSaleCalendarView } from './tax/WashSaleCalendarView'

type ViewMode = 'lots' | 'harvest' | 'calendar'

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'lots', label: 'All Tax Lots' },
  { id: 'harvest', label: 'Harvest Scanner' },
  { id: 'calendar', label: 'Wash Sale Calendar' },
]

function getWashSaleWindow(saleDate: string): { start: string; end: string } {
  const d = new Date(saleDate)
  const start = new Date(d)
  start.setDate(start.getDate() - 30)
  const end = new Date(d)
  end.setDate(end.getDate() + 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function TaxManagementPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const id = accountId ?? ''
  const [view, setView] = useState<ViewMode>('lots')
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set())
  const [costBasisMethod, setCostBasisMethod] = useState<CostBasisMethod>('FIFO')

  const { data: account, isLoading: accountLoading, isError, error, refetch } = useAccount(id)
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

  // Calendar: 61-day wash sale windows (30 days before + 30 days after sale)
  const washSaleWindows = useMemo(() => {
    const now = new Date(MOCK_NOW)
    return (taxLots ?? [])
      .map((lot) => {
        const window = getWashSaleWindow(lot.purchaseDate)
        return {
          ...lot,
          washSaleStart: window.start,
          washSaleEnd: window.end,
          position: positionMap.get(lot.positionId),
        }
      })
      .filter((item) => new Date(item.washSaleEnd) >= now)
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

  if (isError) {
    return <QueryErrorBanner error={error} onRetry={refetch} message="Failed to load tax data" />
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

  const baseCurrency = account.baseCurrency ?? 'USD'

  return (
    <div className="flex flex-col gap-6">
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
        <TaxSummaryCards
          stats={stats}
          washSaleWindowsCount={washSaleWindows.length}
          harvestOpportunitiesLength={harvestOpportunities.length}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Cost Basis Method */}
      <CostBasisMethodCard
        costBasisMethod={costBasisMethod}
        setCostBasisMethod={setCostBasisMethod}
        methodImpact={methodImpact}
        formatWithConversion={formatWithConversion}
        baseCurrency={baseCurrency}
      />

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
        <TaxLotsView
          taxLots={taxLots ?? []}
          positionMap={positionMap}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Harvest Scanner */}
      {view === 'harvest' && (
        <HarvestScannerView
          harvestOpportunities={harvestOpportunities}
          selectedLots={selectedLots}
          toggleLot={toggleLot}
          selectedHarvestAmount={selectedHarvestAmount}
          positionMap={positionMap}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Wash Sale Calendar */}
      {view === 'calendar' && (
        <WashSaleCalendarView washSaleWindows={washSaleWindows} />
      )}
    </div>
  )
}
