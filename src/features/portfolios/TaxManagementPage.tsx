import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { QueryErrorBanner } from '@/components/ui/QueryErrorBanner'
import { useAccount } from '@/hooks/use-accounts'
import { useTaxLots } from '@/hooks/use-tax-lots'
import { usePositions } from '@/hooks/use-portfolio'
import { useOpenWashSaleWindows } from '@/hooks/use-open-wash-sale-windows'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { useCurrencyConverter } from '@/hooks/use-fx'
import { cn } from '@/lib/utils'
import { isHarvestable, computeCostBasisImpact } from './tax/shared'
import { COST_BASIS_METHODS, type CostBasisMethod } from './tax/CostBasisMethodCard'
import { TaxSummaryCards } from './tax/TaxSummaryCards'
import { CostBasisMethodCard } from './tax/CostBasisMethodCard'
import { TaxLotsView } from './tax/TaxLotsView'
import { HarvestScannerView } from './tax/HarvestScannerView'
import { WashSaleCalendarView } from './tax/WashSaleCalendarView'

type ViewMode = 'lots' | 'harvest' | 'calendar'

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'lots', label: 'All tax lots' },
  { id: 'harvest', label: 'Harvest scanner' },
  { id: 'calendar', label: 'Wash sale calendar' },
]

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
  const { rates, isReady: fxReady } = useCurrencyConverter()

  const baseCurrency = account?.baseCurrency ?? 'USD'
  // Fix-round-1 review, Important #3: an earlier version of this gate waited on `!fxReady` too —
  // `isReady` never becomes true once React Query's retries are exhausted, so on a permanent FX
  // outage the skeleton below (which renders before the isError/not-found branches) never yielded
  // to anything. Worse, gating the whole tree's mount on `fxReady` meant every remount of an
  // FX-dependent descendant (e.g. `TaxLotsView`'s per-lot `CurrencyValue`s, each with their own
  // `useFormatCurrency` → `useFXRates` observer) re-triggered React Query's refetch-on-mount for
  // the same errored query, which flips `isReady`/`isError` again, unmounts the tree again, and
  // remounts it again — a self-sustaining refetch loop, confirmed against a real 500 response.
  // FX readiness must not gate the page mount at all; it only gates the harvest computation below.
  const isLoading = accountLoading || lotsLoading

  // Build position lookup for symbol display
  const positionMap = useMemo(() => {
    const map = new Map<string, { symbol: string; name: string }>()
    for (const p of positions ?? []) {
      map.set(p.id, { symbol: p.symbol, name: p.name })
    }
    return map
  }, [positions])

  // Harvest opportunities: lots with unrealized losses greater than HARVEST_LOSS_THRESHOLD_USD.
  // PRE-FLIGHT correction 1 — the threshold is in USD; a lot's gainLoss is in the account's own
  // baseCurrency, so it must be converted before comparing rather than compared as a raw literal.
  // While FX rates are unavailable — still loading, or permanently failed — fail open to an empty
  // list instead of running the comparison against an empty rate map, which would silently
  // reproduce the currency-blind bug this task fixed. This is the *only* place FX readiness gates
  // anything; it must not gate the page's own mount (see isLoading above).
  const harvestOpportunities = useMemo(
    () => fxReady
      ? (taxLots ?? [])
          .filter((lot) => isHarvestable(lot.gainLoss, baseCurrency, rates))
          .sort((a, b) => a.gainLoss - b.gainLoss)
      : [],
    [taxLots, baseCurrency, rates, fxReady],
  )

  // Tax summary stats
  const stats = useMemo(() => {
    if (!taxLots) return null
    const totalUnrealizedGain = taxLots.filter((l) => l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const totalUnrealizedLoss = taxLots.filter((l) => l.gainLoss < 0).reduce((s, l) => s + l.gainLoss, 0)
    const shortTermGain = taxLots.filter((l) => l.holdingPeriod === 'short' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const longTermGain = taxLots.filter((l) => l.holdingPeriod === 'long' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const harvestableAmount = harvestOpportunities.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
    return { totalUnrealizedGain, totalUnrealizedLoss, shortTermGain, longTermGain, harvestableAmount }
  }, [taxLots, harvestOpportunities])

  // Cost basis method impact simulation — computeCostBasisImpact lives in tax/shared.tsx (not
  // inline here) so it is independently importable and testable; see shared.tsx for why.
  const methodImpact = useMemo(() => {
    if (!taxLots || taxLots.length === 0) return null
    return COST_BASIS_METHODS.map((method) => ({
      method,
      ...computeCostBasisImpact(taxLots, method),
    }))
  }, [taxLots])

  const { data: washSaleWindows } = useOpenWashSaleWindows(id)

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

  const selectedLotObjects = harvestOpportunities.filter((l) => selectedLots.has(l.id))

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
          washSaleWindowsCount={washSaleWindows?.length ?? 0}
          harvestOpportunitiesLength={harvestOpportunities.length}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Cost Basis Method */}
      <CostBasisMethodCard
        account={account}
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
          selectedLotObjects={selectedLotObjects}
          positionMap={positionMap}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
          fxUnavailable={!fxReady}
        />
      )}

      {/* Wash sale calendar */}
      {view === 'calendar' && (
        <WashSaleCalendarView windows={washSaleWindows ?? []} />
      )}
    </div>
  )
}
