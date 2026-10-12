import { Scissors, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import type { TaxLot } from '@/types/portfolio'
import { formatCalendarDate } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'
import { HOLDING_LABELS, Th, estimatedTaxBenefit, RATE_DISCLOSURE, type FxStatus } from './shared'

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
  const selectedLoss = selectedLotObjects.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
  // A sale that washes defers its loss into the replacement's basis (§1091(d)); it saves nothing now.
  const selectedBenefit = selectedLotObjects.reduce((s, l) => s + (l.saleWashSaleRisk ? 0 : estimatedTaxBenefit(l)), 0)
  const selectedWashing = selectedLotObjects.filter((l) => l.saleWashSaleRisk).length

  return (
    <div className="space-y-4">
      {selectedLots.size > 0 && (
        <Card className="border-l-[3px] border-l-accent-blue">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-body-strong">{selectedLots.size} lot{selectedLots.size !== 1 ? 's' : ''} selected</p>
              <p className="text-caption text-text-secondary">
                Harvestable loss{' '}
                <span className="font-mono font-medium">{formatWithConversion(selectedLoss, baseCurrency, { compact: true })}</span>
                {' · '}estimated tax benefit{' '}
                <span className="font-mono font-medium text-accent-green">{formatWithConversion(selectedBenefit, baseCurrency, { compact: true })}</span>
                {selectedWashing > 0 && ` · ${selectedWashing} would wash, loss deferred`}
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
                        {lot.saleWashSaleRisk
                          ? <span className="text-caption text-text-tertiary">Deferred</span>
                          : <CurrencyValue value={estimatedTaxBenefit(lot)} from={baseCurrency} />}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {/* The same test the rebalance preview applies to a sell leg: a loss with
                            the same symbol bought in the household in the last 30 days. */}
                        {lot.saleWashSaleRisk ? (
                          <Badge variant="red">Wash sale: bought within 30 days</Badge>
                        ) : (
                          <span className="text-caption text-text-tertiary">No purchase in last 30 days</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {/* An open household loss window blocks buying this symbol back, not selling
                            this lot — the rebalance preview sells the same lot as a harvested loss
                            with no wash-sale flag. */}
                        {lot.repurchaseBlockedUntil ? (
                          <Badge variant="yellow">Repurchase blocked until {formatCalendarDate(lot.repurchaseBlockedUntil)}</Badge>
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
