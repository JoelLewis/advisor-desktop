import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { MeasureError, fmtDayMonthYear, fmtMoney, fmtPrice, fmtQuantity, fmtResult, fmtWeight } from '@/kit/measure'
import type { Position, TaxLot } from '@/types/portfolio'

const isCash = (p: Position) => p.assetClass === 'cash'

type HoldingsTableProps = { positions: Position[]; accountValue: number }

export function HoldingsTable({ positions, accountValue }: HoldingsTableProps) {
  const holdingsValue = positions.reduce((s, p) => s + p.marketValue, 0)
  return (
    <DataTable caption="Holdings" rows={positions} getRowId={(p) => p.id} total={positions.length}
      noun={{ singular: 'position', plural: 'positions' }}
      columns={[
        { id: 'symbol', header: 'Symbol', cell: (p) => p.symbol, sortValue: (p) => p.symbol },
        { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (p) => (isCash(p) ? <NotApplicable /> : <Num text={fmtQuantity(p.quantity)} />), sortValue: (p) => p.quantity },
        { id: 'price', header: 'Price', unit: 'USD', align: 'right', cell: (p) => (isCash(p) ? <NotApplicable /> : fmtPrice(p.price)), sortValue: (p) => p.price },
        { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (p) => fmtMoney(p.marketValue), sortValue: (p) => p.marketValue, proportion: (p) => p.weight },
        { id: 'weight', header: 'Weight', unit: '%', align: 'right', cell: (p) => fmtWeight(p.weight), sortValue: (p) => p.weight },
        { id: 'gain', header: 'Unrealized', unit: 'USD', align: 'right', cell: (p) => <Num text={fmtResult(p.gainLoss)} />, sortValue: (p) => p.gainLoss },
      ]}
      totals={{ label: 'Total', tiesTo: { label: 'account value', expected: accountValue, actual: holdingsValue },
        cells: { value: fmtMoney(holdingsValue), weight: fmtWeight(positions.reduce((s, p) => s + p.weight, 0)) } }} />
  )
}

type TaxLotsTableProps = { lots: TaxLot[]; positions: Position[] }

export function TaxLotsTable({ lots, positions }: TaxLotsTableProps) {
  const symbolOf = new Map(positions.map((p) => [p.id, p.symbol]))
  const symbolFor = (lot: TaxLot) => {
    const symbol = symbolOf.get(lot.positionId)
    if (!symbol) throw new MeasureError('A tax lot belongs to no position in this account')
    return symbol
  }
  return (
    <DataTable caption="Tax lots" density="dense" rows={lots} getRowId={(l) => l.id} total={lots.length}
      noun={{ singular: 'lot', plural: 'lots' }}
      columns={[
        { id: 'symbol', header: 'Symbol', cell: symbolFor, sortValue: symbolFor },
        { id: 'acquired', header: 'Acquired', cell: (l) => fmtDayMonthYear(l.purchaseDate), sortValue: (l) => l.purchaseDate },
        { id: 'term', header: 'Term', cell: (l) => (l.holdingPeriod === 'long' ? 'Long-term' : 'Short-term'), sortValue: (l) => l.holdingPeriod },
        { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} />, sortValue: (l) => l.quantity },
        { id: 'gain', header: 'Unrealized', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtResult(l.gainLoss)} />, sortValue: (l) => l.gainLoss },
      ]} />
  )
}
