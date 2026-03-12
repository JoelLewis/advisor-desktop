import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { cn, formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import type { Position } from '@/types/portfolio'
import type { BenchmarkComparison } from '@/types/performance'
import type { Order } from '@/services/oms'
import type { CurrencyCode } from '@/types/currency'
import type { ColumnDef } from '@tanstack/react-table'

export const COST_BASIS_LABELS: Record<string, string> = {
  specific_id: 'Specific Identification',
  fifo: 'FIFO (First In, First Out)',
  average_cost: 'Average Cost',
}

export function makePositionColumns(onTrade?: (symbol: string, side: 'buy' | 'sell', assetClass?: string) => void, currencyCode?: CurrencyCode): ColumnDef<Position, unknown>[] {
  const cols: ColumnDef<Position, unknown>[] = [
    {
      accessorKey: 'symbol', header: 'Symbol',
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-body-strong">{row.original.symbol}</p>
          <p className="text-caption text-text-tertiary">{row.original.name}</p>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'assetClass', header: 'Asset Class',
      cell: ({ row }) => <span className="text-caption">{ASSET_CLASS_LABELS[row.original.assetClass] ?? row.original.assetClass}</span>,
      size: 110,
    },
    {
      accessorKey: 'quantity', header: 'Qty',
      cell: ({ row }) => <span className="font-mono">{row.original.quantity.toLocaleString()}</span>,
      size: 80,
    },
    {
      accessorKey: 'price', header: 'Price',
      cell: ({ row }) => <CurrencyValue value={row.original.price} from={currencyCode ?? 'USD'} className="font-mono" />,
      size: 100,
    },
    {
      accessorKey: 'marketValue', header: 'Mkt Value',
      cell: ({ row }) => <CurrencyValue value={row.original.marketValue} from={currencyCode ?? 'USD'} compact className="font-mono" />,
      size: 100,
    },
    {
      accessorKey: 'weight', header: 'Weight',
      cell: ({ row }) => <span className="font-mono">{(row.original.weight * 100).toFixed(1)}%</span>,
      size: 70,
    },
    {
      accessorKey: 'gainLoss', header: 'Gain/Loss',
      cell: ({ row }) => (
        <div className={cn('font-mono', row.original.gainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
          <p><CurrencyValue value={row.original.gainLoss} from={currencyCode ?? 'USD'} compact /></p>
          <p className="text-caption">{formatPercent(row.original.gainLossPercent * 100)}</p>
        </div>
      ),
      size: 110,
    },
  ]

  if (onTrade) {
    cols.push({
      id: 'trade',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onTrade(row.original.symbol, 'buy', row.original.assetClass)}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-accent-green transition-colors hover:bg-accent-green/10"
          >
            Buy
          </button>
          <button
            onClick={() => onTrade(row.original.symbol, 'sell', row.original.assetClass)}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-accent-red transition-colors hover:bg-accent-red/10"
          >
            Sell
          </button>
        </div>
      ),
      size: 90,
    })
  }

  return cols
}

export const benchmarkColumns: ColumnDef<BenchmarkComparison, unknown>[] = [
  { accessorKey: 'period', header: 'Period', cell: ({ row }) => <span className="font-mono uppercase">{row.original.period}</span>, size: 80 },
  { accessorKey: 'portfolioReturn', header: 'Portfolio (TWR)', cell: ({ row }) => <span className="font-mono">{formatPercent(row.original.portfolioReturn * 100)}</span>, size: 100 },
  { accessorKey: 'benchmarkReturn', header: 'Benchmark', cell: ({ row }) => <span className="font-mono">{formatPercent(row.original.benchmarkReturn * 100)}</span>, size: 100 },
  {
    accessorKey: 'alpha', header: 'Alpha',
    cell: ({ row }) => (
      <span className={cn('font-mono', row.original.alpha >= 0 ? 'text-accent-green' : 'text-accent-red')}>
        {formatPercent(row.original.alpha * 100)}
      </span>
    ),
    size: 80,
  },
  { accessorKey: 'trackingError', header: 'TE', cell: ({ row }) => <span className="font-mono text-text-secondary">{(row.original.trackingError * 100).toFixed(2)}%</span>, size: 80 },
]

export const orderColumns: ColumnDef<Order, unknown>[] = [
  {
    accessorKey: 'symbol', header: 'Symbol',
    cell: ({ row }) => <span className="font-mono text-body-strong">{row.original.symbol}</span>,
    size: 80,
  },
  {
    accessorKey: 'side', header: 'Side',
    cell: ({ row }) => (
      <Badge variant={row.original.side === 'buy' ? 'green' : 'red'}>{row.original.side}</Badge>
    ),
    size: 70,
  },
  {
    accessorKey: 'quantity', header: 'Qty',
    cell: ({ row }) => <span className="font-mono">{row.original.quantity.toLocaleString()}</span>,
    size: 70,
  },
  {
    accessorKey: 'orderType', header: 'Type',
    cell: ({ row }) => <span className="text-caption">{row.original.orderType}{row.original.limitPrice ? ` @ ${formatCurrency(row.original.limitPrice)}` : ''}</span>,
    size: 120,
  },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => {
      const v = { pending: 'yellow' as const, submitted: 'blue' as const, filled: 'green' as const, cancelled: 'default' as const }
      return <Badge variant={v[row.original.status]}>{row.original.status}</Badge>
    },
    size: 100,
  },
  {
    accessorKey: 'filledPrice', header: 'Fill Price',
    cell: ({ row }) => <span className="font-mono">{row.original.filledPrice ? formatCurrency(row.original.filledPrice) : '—'}</span>,
    size: 100,
  },
  {
    accessorKey: 'submittedAt', header: 'Submitted',
    cell: ({ row }) => <span className="font-mono text-caption text-text-secondary">{formatDate(row.original.submittedAt)}</span>,
    size: 110,
  },
]
