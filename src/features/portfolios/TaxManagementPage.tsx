import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { QueryErrorBanner } from '@/components/ui/QueryErrorBanner'
import { useAccount } from '@/hooks/use-accounts'
import { useTaxLots } from '@/hooks/use-tax-lots'
import { usePositions } from '@/hooks/use-portfolio'
import { useOpenWashSaleWindows } from '@/hooks/use-open-wash-sale-windows'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { useCurrencyConverter } from '@/hooks/use-fx'
import { cn } from '@/lib/utils'
import { harvestingDisclosureFor } from '@/lib/tax-treatment'
import { isHarvestable, estimatedTaxBenefit, computeCostBasisImpact, fxStatusFrom, harvestFxStatus } from './tax/shared'
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
  const { formatWithConversion, reportingCurrency } = useFormatCurrency()
  const { rates, isReady: fxReady, isError: fxError } = useCurrencyConverter()
  const fxStatus = fxStatusFrom(fxReady, fxError)

  const baseCurrency = account?.baseCurrency ?? 'USD'
  // Fix-round-3 review: harvestOpportunities, the summary card, and the scanner tab all derive
  // their availability from this single value rather than the raw `fxStatus` — a USD-native
  // account's harvest computation never touches the FX rate map (see `harvestFxStatus` in
  // tax/shared.tsx), so it must read 'ready' even while the global FX query is down. All but
  // four fixture accounts are USD-native; gating them on `fxStatus` directly suppressed a
  // fully-known number across nearly the whole book over an outage irrelevant to them.
  const harvestStatus = harvestFxStatus(baseCurrency, fxStatus)
  // Fix-round-1 review, Important #3, corrected in fix-round-2 review: the bug shipped at
  // `4e3c665` was `isLoading = accountLoading || lotsLoading || !fxReady` — a *permanent* gate.
  // `isReady` never becomes true once React Query's retries are exhausted, so on an FX outage
  // `isLoading` stays `true` forever and the whole tree — including the isError/not-found
  // branches below — never renders. Nothing there ever mounts, so there is nothing to remount:
  // that shape is a static brick, exactly as the round-1 review diagnosed, not a loop.
  //
  // A *different*, transient gate — `!fxReady && !fxError` — is the one that loops, and it only
  // ever existed here as an intermediate mutation while testing the fix, never as shipped code.
  // Once the FX query settles into `error`, that expression flips back to `false` (i.e. "loading"
  // again) the instant anything remounts an FX-consuming descendant — e.g. `TaxLotsView`'s
  // per-lot `CurrencyValue`s, each with its own `useFormatCurrency` → `useFXRates` observer —
  // because mounting a *new* observer against an already-errored query triggers React Query's
  // refetch-on-mount. That refetch flips `isLoading` back to `true`, unmounting the tree, which
  // remounts it once the query settles again, repeating indefinitely. Confirmed against a real
  // 500 response: roughly 380 fetches/sec under this suite's `gcTime: 0` test client — `gcTime: 0`
  // is what turns a much slower underlying loop into that storm, not what causes the loop itself.
  //
  // Either shape is wrong for the same underlying reason: FX readiness must not gate the page
  // mount at all, permanently or transiently. It only gates the harvest computation below.
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
  // While FX rates are unavailable *and actually needed* (see harvestStatus above) fail open to
  // an empty list instead of running the comparison against an empty rate map, which would
  // silently reproduce the currency-blind bug this task fixed. This is the *only* place FX
  // readiness gates anything; it must not gate the page's own mount (see isLoading above).
  const harvestOpportunities = useMemo(
    () => harvestStatus === 'ready'
      ? (taxLots ?? [])
          .filter((lot) => isHarvestable(lot.gainLoss, baseCurrency, rates))
          .sort((a, b) => a.gainLoss - b.gainLoss)
      : [],
    [taxLots, baseCurrency, rates, harvestStatus],
  )

  // Tax summary stats
  const stats = useMemo(() => {
    if (!taxLots) return null
    const totalUnrealizedGain = taxLots.filter((l) => l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const totalUnrealizedLoss = taxLots.filter((l) => l.gainLoss < 0).reduce((s, l) => s + l.gainLoss, 0)
    const shortTermGain = taxLots.filter((l) => l.holdingPeriod === 'short' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const longTermGain = taxLots.filter((l) => l.holdingPeriod === 'long' && l.gainLoss > 0).reduce((s, l) => s + l.gainLoss, 0)
    const harvestableAmount = harvestOpportunities.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
    // §9.1 · the page-level "estimated tax benefit" total. Only ever rendered in the taxable
    // branch below (see `disclosure`) — a tax-deferred or tax-free account never computes past
    // `harvestOpportunities === []` in the first place, but the gate on *rendering* this value is
    // what a component test can actually observe, so that is where it is enforced.
    const estimatedBenefit = harvestOpportunities.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
    return { totalUnrealizedGain, totalUnrealizedLoss, shortTermGain, longTermGain, harvestableAmount, estimatedBenefit }
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

  // §9.1 · non-null only for a tax-deferred or tax-free wrapper (Traditional/SEP/SIMPLE/Inherited
  // IRA, Roth IRA, 529) — never for `taxable` or `trust_taxable` (an irrevocable trust files its
  // own return). This is the single gate every harvesting-adjacent surface below branches on;
  // nothing re-derives "is this account taxable" a second way.
  const disclosure = harvestingDisclosureFor(account.taxTreatment)
  const visibleTabs = disclosure ? VIEW_TABS.filter((t) => t.id !== 'harvest') : VIEW_TABS

  function toggleLot(lotId: string) {
    setSelectedLots((prev) => {
      const next = new Set(prev)
      if (next.has(lotId)) next.delete(lotId)
      else next.add(lotId)
      return next
    })
  }

  const selectedLotObjects = harvestOpportunities.filter((l) => selectedLots.has(l.id))

  // Fix-round-2 review, Important #1: `formatWithConversion` falls through to the raw,
  // unconverted value whenever FX isn't ready (see use-format-currency.ts) — a deliberate,
  // correct choice for a demo that must render something, but it means every figure on this
  // screen quietly becomes the account's native-currency number wearing the reporting currency's
  // symbol (e.g. a CHF amount rendered with a "$"). Self-consistent and therefore invisible
  // unless disclosed. Only matters when the account's own currency actually differs from the
  // reporting currency — a USD account reporting in USD is never affected by FX being down.
  const fxCurrencyMismatch = fxStatus !== 'ready' && baseCurrency !== reportingCurrency

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

      {fxCurrencyMismatch && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-body text-amber-800">
            Exchange rates are unavailable. Every figure below is shown in {baseCurrency}, the
            account&rsquo;s own currency — not converted to {reportingCurrency}.
          </p>
        </div>
      )}

      {/* §9.1 · a tax-deferred or tax-free account never gets the harvest scanner, the benefit
          total, or the cost-basis simulator — a loss here produces no current-year deduction, so
          those surfaces have nothing true to show. The tax lot table and wash sale calendar still
          render: they are a record of what the account holds and what has already happened to it,
          not a claim about a benefit. */}
      {disclosure && (
        <div className="flex items-center gap-3 rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-4 py-3">
          <Info className="h-5 w-5 shrink-0 text-accent-blue" />
          <p className="text-body text-text-primary">{disclosure}</p>
        </div>
      )}

      {/* Summary cards */}
      {!disclosure && stats && (
        <TaxSummaryCards
          stats={stats}
          washSaleWindowsCount={washSaleWindows?.length ?? 0}
          harvestOpportunitiesLength={harvestOpportunities.length}
          harvestUnavailable={harvestStatus !== 'ready'}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
        />
      )}

      {/* Cost Basis Method */}
      {!disclosure && (
        <CostBasisMethodCard
          account={account}
          costBasisMethod={costBasisMethod}
          setCostBasisMethod={setCostBasisMethod}
          methodImpact={methodImpact}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
        />
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border-primary bg-surface-primary p-1">
        {visibleTabs.map((tab) => (
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
      {!disclosure && view === 'harvest' && (
        <HarvestScannerView
          harvestOpportunities={harvestOpportunities}
          selectedLots={selectedLots}
          toggleLot={toggleLot}
          selectedLotObjects={selectedLotObjects}
          positionMap={positionMap}
          formatWithConversion={formatWithConversion}
          baseCurrency={baseCurrency}
          fxStatus={harvestStatus}
        />
      )}

      {/* Wash sale calendar */}
      {view === 'calendar' && (
        <WashSaleCalendarView windows={washSaleWindows ?? []} />
      )}
    </div>
  )
}
