import { Scissors, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import type { TaxLot } from '@/types/portfolio'
import { formatCalendarDate, cn } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'
import { HOLDING_LABELS, RATE_DISCLOSURE, harvestBenefitNow, lossAllowedNow, lossDeferred, lossDisallowed, washesOnSale, type FxStatus } from '@/lib/tax-rules'

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

type HarvestScannerViewProps = {
  harvestOpportunities: TaxLot[]
  selectedLots: Set<string>
  toggleLot: (lotId: string) => void
  selectedLotObjects: TaxLot[]
  positionMap: Map<string, { symbol: string; name: string }>
  formatWithConversion: (value: number, currency: CurrencyCode, opts?: { compact?: boolean }) => string
  baseCurrency: CurrencyCode
  /**
   * Fix-round-1 review, Important #3 / fix-round-2 review, Minor M2 — the scanner can't safely
   * apply the (USD) harvest threshold to a non-USD account's lots without a live rate, so it
   * fails open to an empty, explained list rather than a currency-blind comparison or blocking
   * the whole page. `'loading'` vs `'error'` get different copy: `useCurrencyConverter` exposes
   * `isError` specifically so this distinction doesn't collapse into one ambiguous boolean.
   */
  fxStatus?: FxStatus
}

/**
 * The tax a sale saves now, on the allowed part of the loss. A fully washed lot saves nothing now,
 * so it names what happens to its loss instead of showing $0.
 */
function BenefitCell({ lot, baseCurrency }: { lot: TaxLot; baseCurrency: CurrencyCode }) {
  if (lossAllowedNow(lot) < 0) return <CurrencyValue value={harvestBenefitNow(lot)} from={baseCurrency} />
  const { deferredShares, disallowedShares } = lot.saleWash
  const outcome = deferredShares > 0 && disallowedShares > 0 ? 'Deferred and disallowed'
    : disallowedShares > 0 ? 'Permanently disallowed' : 'Deferred'
  return <span className="text-caption text-text-tertiary">{outcome}</span>
}

/**
 * How much of this lot a sale today would wash: replacement shares the same taxpayer bought in the
 * last 30 days, matched share for share. A replacement in a taxable account defers the matched
 * loss into its own basis; one in an IRA or Roth disallows it for good.
 */
function SaleWashCell({ lot }: { lot: TaxLot }) {
  if (!washesOnSale(lot)) return <span className="text-caption text-text-tertiary">No purchase in last 30 days</span>
  const { deferredShares, disallowedShares } = lot.saleWash
  const shares = (n: number) => n.toLocaleString()
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge variant="red">Wash sale: {shares(deferredShares + disallowedShares)} of {shares(lot.quantity)} shares</Badge>
      {deferredShares > 0 && (
        <span className="text-caption text-text-tertiary">{shares(deferredShares)} deferred into a taxable replacement&rsquo;s basis</span>
      )}
      {disallowedShares > 0 && (
        <span className="text-caption text-accent-red">{shares(disallowedShares)} permanently disallowed: bought in an IRA or Roth</span>
      )}
    </div>
  )
}

export function HarvestScannerView({
  harvestOpportunities,
  selectedLots,
  toggleLot,
  selectedLotObjects,
  positionMap,
  formatWithConversion,
  baseCurrency,
  fxStatus = 'ready',
}: HarvestScannerViewProps) {
  // §1091 takes only the washed shares' part of a loss (Reg. §1.1091-1(c)): the rest is realised
  // and saves tax now. The washed part is deferred into a taxable replacement's basis, or lost for
  // good when the replacement was bought in an IRA or Roth.
  const selectedLoss = selectedLotObjects.reduce((s, l) => s - lossAllowedNow(l), 0)
  const selectedBenefit = selectedLotObjects.reduce((s, l) => s + harvestBenefitNow(l), 0)
  const selectedDeferred = selectedLotObjects.reduce((s, l) => s - lossDeferred(l), 0)
  const selectedDisallowed = selectedLotObjects.reduce((s, l) => s - lossDisallowed(l), 0)
  const compact = (n: number) => formatWithConversion(n, baseCurrency, { compact: true })

  return (
    <div className="space-y-4">
      {selectedLots.size > 0 && (
        <Card className="border-l-[3px] border-l-accent-blue">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-body-strong">{selectedLots.size} lot{selectedLots.size !== 1 ? 's' : ''} selected</p>
              <p className="text-caption text-text-secondary">
                Loss realised now{' '}
                <span className="font-mono font-medium">{compact(selectedLoss)}</span>
                {' · '}estimated tax benefit{' '}
                <span className="font-mono font-medium text-accent-green">{compact(selectedBenefit)}</span>
                {selectedDeferred > 0 && ` · ${compact(selectedDeferred)} deferred by a wash sale`}
                {selectedDisallowed > 0 && ` · ${compact(selectedDisallowed)} permanently disallowed (IRA or Roth replacement)`}
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
          {fxStatus === 'error' ? (
            <div className="px-4 py-12 text-center text-text-tertiary">
              Exchange rates are unavailable, so harvest opportunities can&rsquo;t be compared
              against the US$1,000 threshold right now. Try again shortly.
            </div>
          ) : fxStatus === 'loading' ? (
            <div className="px-4 py-12 text-center text-text-tertiary">
              Loading exchange rates before comparing losses against the US$1,000 threshold…
            </div>
          ) : harvestOpportunities.length === 0 ? (
            <div className="px-4 py-12 text-center text-text-tertiary">No harvest opportunities found (losses greater than US$1,000, converted to USD)</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  <Th>Select</Th>
                  <Th>Symbol</Th>
                  <Th>Holding</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Unrealized Loss</Th>
                  <Th align="right">Est. tax benefit</Th>
                  <Th align="center">Sale (§1091)</Th>
                  <Th align="center">Repurchase (§1091)</Th>
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
                      <td className="px-4 py-2.5 text-right font-mono text-accent-red"><CurrencyValue value={lot.gainLoss} from={baseCurrency} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-accent-green">
                        <BenefitCell lot={lot} baseCurrency={baseCurrency} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <SaleWashCell lot={lot} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {/* An open household loss window blocks buying this symbol back, not selling
                            this lot — the rebalance preview sells the same lot as a harvested loss
                            with no wash-sale flag. */}
                        {/* `repurchaseBlockedUntil` is the window's last day, and a buy on it still washes. */}
                        {lot.repurchaseBlockedUntil ? (
                          <Badge variant="yellow">Repurchase blocked through {formatCalendarDate(lot.repurchaseBlockedUntil)}</Badge>
                        ) : (
                          <span className="text-caption text-text-tertiary">No open window</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
        {harvestOpportunities.length > 0 && (
          <p className="px-4 py-3 text-caption text-text-tertiary">{RATE_DISCLOSURE}</p>
        )}
      </Card>
    </div>
  )
}
