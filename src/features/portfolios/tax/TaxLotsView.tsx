import { memo } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { formatDate, cn } from '@/lib/utils'
import type { TaxLot } from '@/types/portfolio'
import type { CurrencyCode } from '@/types/currency'
import { HOLDING_LABELS, Th } from './shared'

const TaxLotRow = memo(function TaxLotRow({
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
})

type TaxLotsViewProps = {
  taxLots: TaxLot[]
  positionMap: Map<string, { symbol: string; name: string }>
  baseCurrency: CurrencyCode
}

export function TaxLotsView({ taxLots, positionMap, baseCurrency }: TaxLotsViewProps) {
  return (
    <Card>
      <CardHeader>Tax Lots ({taxLots.length})</CardHeader>
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
              {taxLots.map((lot) => (
                <TaxLotRow key={lot.id} lot={lot} positionMap={positionMap} baseCurrency={baseCurrency} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
