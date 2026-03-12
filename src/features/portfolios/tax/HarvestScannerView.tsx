import { Scissors, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import type { TaxLot } from '@/types/portfolio'
import type { CurrencyCode } from '@/types/currency'
import { HOLDING_LABELS, Th } from './shared'

type HarvestScannerViewProps = {
  harvestOpportunities: TaxLot[]
  selectedLots: Set<string>
  toggleLot: (lotId: string) => void
  selectedHarvestAmount: number
  positionMap: Map<string, { symbol: string; name: string }>
  formatWithConversion: (value: number, currency: CurrencyCode, opts?: { compact?: boolean }) => string
  baseCurrency: CurrencyCode
}

export function HarvestScannerView({
  harvestOpportunities,
  selectedLots,
  toggleLot,
  selectedHarvestAmount,
  positionMap,
  formatWithConversion,
  baseCurrency,
}: HarvestScannerViewProps) {
  return (
    <div className="space-y-4">
      {selectedLots.size > 0 && (
        <Card className="border-l-[3px] border-l-accent-blue">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-body-strong">{selectedLots.size} lot{selectedLots.size !== 1 ? 's' : ''} selected</p>
              <p className="text-caption text-text-secondary">
                Estimated tax savings: <span className="font-mono font-medium text-accent-green">{formatWithConversion(selectedHarvestAmount * 0.37, baseCurrency, { compact: true })}</span>
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
                      <td className="px-4 py-2.5 text-right font-mono text-accent-red"><CurrencyValue value={lot.gainLoss} from={baseCurrency} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-accent-green"><CurrencyValue value={Math.abs(lot.gainLoss) * 0.37} from={baseCurrency} /></td>
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
  )
}
