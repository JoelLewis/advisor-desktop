import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type Row, type SortingState,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { MeasureError } from '@/kit/measure'
import type { Column, Density, RowKey, Totals, TiesTo } from './types'

const ROW_HEIGHT: Record<Density, string> = { dense: 'h-6 text-table-dense stretch-dense', regular: 'h-7 text-table stretch-table', narrative: 'h-[34px] text-table stretch-table' }

const DEFAULT_TIE_TOLERANCE = 1

function assertTies(tiesTo: TiesTo | undefined): void {
  if (tiesTo && Math.abs(tiesTo.expected - tiesTo.actual) > (tiesTo.tolerance ?? DEFAULT_TIE_TOLERANCE)) {
    throw new MeasureError(`Totals do not tie to ${tiesTo.label}: off by ${Math.abs(tiesTo.expected - tiesTo.actual)}`)
  }
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"]'

const isInteractiveTarget = (target: EventTarget): boolean =>
  target instanceof Element && target.closest(INTERACTIVE) !== null

type DataTableProps<T> = {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  noun: { singular: string; plural: string }
  /** Said in place of "No {plural}." when the table has no rows. */
  empty?: string
  total?: number
  density?: Density
  totals?: Totals
  onActivate?: (row: T) => void
  initialSort?: { id: string; desc: boolean }
  rowKeys?: readonly RowKey<T>[]
  mutedRow?: (row: T) => boolean
  /** The id of the row whose detail is open; given, every row says whether it is the open one. */
  expandedRowId?: string
}

type DataTableRowProps<T> = {
  row: Row<T>
  index: number
  tabbable: boolean | undefined
  expanded: boolean | undefined
  muted: boolean
  shortcuts: string | undefined
  density: Density
  columns: Column<T>[]
  onRowKeyDown: (e: KeyboardEvent<HTMLTableRowElement>, index: number) => void
  onRowFocus: (id: string) => void
  onRowActivate: ((row: T) => void) | undefined
  rowRef: (index: number, el: HTMLTableRowElement | null) => void
}

function DataTableRowView<T>({
  row, index, tabbable, expanded, muted, shortcuts, density, columns, onRowKeyDown, onRowFocus, onRowActivate, rowRef,
}: DataTableRowProps<T>) {
  const interactive = tabbable !== undefined
  const byId = new Map(columns.map((c) => [c.id, c]))
  return (
    <tr
      ref={(el) => rowRef(index, el)}
      tabIndex={tabbable === undefined ? undefined : tabbable ? 0 : -1}
      aria-expanded={expanded}
      aria-keyshortcuts={interactive ? shortcuts : undefined}
      onFocus={interactive ? () => onRowFocus(row.id) : undefined}
      onKeyDown={interactive ? (e) => onRowKeyDown(e, index) : undefined}
      onClick={onRowActivate ? (e) => { if (!isInteractiveTarget(e.target)) onRowActivate(row.original) } : undefined}
      data-muted={muted ? 'true' : undefined}
      className={cn('border-b border-rule', interactive && 'focus-visible:bg-band', ROW_HEIGHT[density], muted && 'text-ink-3')}
    >
      {row.getVisibleCells().map((cell) => {
        const col = byId.get(cell.column.id)
        const p = col?.proportion?.(row.original)
        return (
          <td key={cell.id} role={interactive ? 'gridcell' : undefined} className={cn(col?.wrap ? 'min-w-32 whitespace-normal px-2 py-1' : 'whitespace-nowrap px-2', col?.align === 'right' ? 'text-right tabular' : 'text-left')}>
            {p !== undefined ? (
              <span className="inline-flex w-full items-center justify-end gap-2">
                <span aria-hidden className="inline-block h-1.5 bg-ink-3" style={{ width: `${Math.round(Math.max(0, Math.min(1, p)) * 64)}px` }} />
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            ) : flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}

const DataTableRow = memo(DataTableRowView) as typeof DataTableRowView

export function DataTable<T>({
  caption, columns, rows, getRowId, noun, empty, total, density = 'regular', totals, onActivate, initialSort, rowKeys, mutedRow, expandedRowId,
}: DataTableProps<T>) {
  assertTies(totals?.tiesTo)
  const [sorting, setSorting] = useState<SortingState>(initialSort ? [initialSort] : [])
  const [activeId, setActiveId] = useState<string | null>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])

  const defs = useMemo<ColumnDef<T>[]>(
    () => columns.map((c) => ({
      id: c.id,
      accessorFn: (row: T) => c.sortValue?.(row) ?? 0,
      enableSorting: c.sortValue !== undefined,
      header: c.header,
      cell: ({ row }) => c.cell(row.original),
    })),
    [columns],
  )

  const table = useReactTable({
    data: rows,
    columns: defs,
    state: { sorting },
    onSortingChange: setSorting,
    sortDescFirst: false,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const sorted = table.getRowModel().rows
  const shown = sorted.length
  const all = total ?? rows.length
  const byId = new Map(columns.map((c) => [c.id, c]))
  const interactive = onActivate !== undefined || (rowKeys ?? []).length > 0
  const shortcuts = [...(onActivate ? ['Enter'] : []), ...(rowKeys ?? []).map((k) => k.key)].join(' ')

  const foundIndex = sorted.findIndex((r) => r.id === activeId)
  const activeIndex = foundIndex === -1 ? 0 : foundIndex

  const latest = useRef({ sorted, shown, onActivate, rowKeys })
  latest.current = { sorted, shown, onActivate, rowKeys }

  const rowRef = useCallback((index: number, el: HTMLTableRowElement | null) => { rowRefs.current[index] = el }, [])
  const onRowFocus = useCallback((id: string) => setActiveId(id), [])

  const onRowKeyDown = useCallback((e: KeyboardEvent<HTMLTableRowElement>, index: number) => {
    const { sorted: rowsNow, shown: count, onActivate: activate, rowKeys: keys } = latest.current
    const moveTo = (to: number) => {
      const next = Math.max(0, Math.min(count - 1, to))
      const target = rowsNow[next]
      if (!target) return
      setActiveId(target.id)
      rowRefs.current[next]?.focus()
    }
    if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') { e.preventDefault(); moveTo(index + 1) }
    else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') { e.preventDefault(); moveTo(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); moveTo(0) }
    else if (e.key === 'End') { e.preventDefault(); moveTo(count - 1) }
    else if (e.key === 'Enter' && activate) { e.preventDefault(); const r = rowsNow[index]; if (r) activate(r.original) }
    else {
      const binding = keys?.find((k) => k.key === e.key)
      const r = rowsNow[index]
      if (binding && r) { e.preventDefault(); e.stopPropagation(); binding.run(r.original) }
    }
  }, [])

  const activateLatest = useCallback((row: T) => latest.current.onActivate?.(row), [])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="min-w-0 overflow-x-auto" data-scroll="table">
        <table role={interactive ? 'grid' : undefined} className="min-w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-ink">
                {group.headers.map((header) => {
                  const col = byId.get(header.column.id)
                  const sort = header.column.getIsSorted()
                  const label = (
                    <>
                      {col?.header}
                      {col?.unit ? <>{' '}<span className="text-ink-3">{col.unit}</span></> : null}
                    </>
                  )
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={header.column.getCanSort() ? (sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none') : undefined}
                      className={cn('whitespace-nowrap px-2 py-2 text-table font-semibold text-ink-2', col?.align === 'right' ? 'text-right' : 'text-left')}
                    >
                      {header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()}>
                          {label}
                        </button>
                      ) : label}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {shown === 0 ? (
              <tr><td colSpan={columns.length} className="px-2 py-3 text-body text-ink-3">{all === 0 ? (empty ?? `No ${noun.plural}.`) : `None of ${all} ${all === 1 ? noun.singular : noun.plural} shown.`}</td></tr>
            ) : sorted.map((row, i) => (
              <DataTableRow
                key={row.id}
                row={row}
                index={i}
                tabbable={interactive ? i === activeIndex : undefined}
                expanded={expandedRowId === undefined ? undefined : row.id === expandedRowId}
                muted={mutedRow?.(row.original) === true}
                shortcuts={shortcuts}
                density={density}
                columns={columns}
                onRowKeyDown={onRowKeyDown}
                onRowFocus={onRowFocus}
                onRowActivate={onActivate ? activateLatest : undefined}
                rowRef={rowRef}
              />
            ))}
          </tbody>
          {totals ? (
            <tfoot>
              <tr className="border-t-2 border-ink font-semibold">
                {columns.map((c, i) => (
                  <td key={c.id} className={cn('whitespace-nowrap px-2 py-2 text-table', c.align === 'right' ? 'text-right tabular' : 'text-left')}>
                    {i === 0 ? (
                      <span className="flex flex-col">
                        <span>{totals.label}</span>
                        {totals.tiesTo ? <span className="text-label font-normal text-ink-3">ties to {totals.tiesTo.label}</span> : null}
                      </span>
                    ) : totals.cells[c.id] ?? null}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <p className="text-label text-ink-3">{shown} of {all} {all === 1 ? noun.singular : noun.plural}</p>
    </div>
  )
}
