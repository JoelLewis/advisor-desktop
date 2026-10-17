import { useMemo } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import type { Column } from '@/kit/data-table/types'
import { fmtDayMonthYear, fmtMoney, fmtQuantity, fmtResult } from '@/kit/measure'
import { SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { DraftPreview } from '@/types/workspace-proposal'
import { legRows, type LegRow } from './leg-rows'

type WorkbenchLegsProps = {
  view: DraftPreview
  caption: string
  onExpand: (symbol: string) => void
  expandedSymbol?: string
  onToggleExclude?: (symbol: string) => void
}

const result = (v: number | undefined) => (v === undefined ? <NotApplicable /> : fmtResult(v))

export function WorkbenchLegs({ view, caption, expandedSymbol, onExpand, onToggleExclude }: WorkbenchLegsProps) {
  const currency = view.preview.currency
  const rows = useMemo(() => legRows(view), [view])
  const columns = useMemo<Column<LegRow>[]>(() => [
    { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol },
    { id: 'name', header: 'Name', wrap: true, cell: (r) => r.name },
    { id: 'side', header: 'Side', cell: (r) => SIDE_WORDS[r.side] },
    { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (r) => <Num text={fmtQuantity(r.quantity)} /> },
    { id: 'value', header: 'Value', unit: currency, align: 'right', cell: (r) => fmtMoney(r.estimatedValue) },
    { id: 'st', header: 'ST', unit: currency, align: 'right', cell: (r) => result(r.shortTerm) },
    { id: 'lt', header: 'LT', unit: currency, align: 'right', cell: (r) => result(r.longTerm) },
    { id: 'washed', header: 'Washed', unit: currency, align: 'right', cell: (r) => result(r.washed) },
    { id: 'restricted', header: "Don't repurchase through", cell: (r) => (r.restrictedTo ? fmtDayMonthYear(r.restrictedTo) : '') },
    { id: 'check', header: 'Pre-trade', cell: (r) => (r.excluded ? <Tag>EXCLUDED</Tag> : <StatusCode status={r.status} />) },
  ], [currency])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <DataTable caption={caption} rows={rows} getRowId={(r) => r.symbol} noun={{ singular: 'leg', plural: 'legs' }}
        onActivate={(r) => onExpand(r.symbol)}
        rowKeys={onToggleExclude ? [{ key: 'x', run: (r) => onToggleExclude(r.symbol) }] : []}
        mutedRow={(r) => r.excluded}
        expandedRowId={expandedSymbol} columns={columns} />
      <p className="text-label text-ink-3">
        {onToggleExclude ? 'Enter shows a leg and its lots · x excludes or includes it · ⌘S or Ctrl+S saves the draft' : 'Enter shows a leg and its lots'}
        {' · ST and LT are realized short- and long-term results; washed is the part of a loss the wash-sale rule takes.'}
      </p>
    </div>
  )
}
