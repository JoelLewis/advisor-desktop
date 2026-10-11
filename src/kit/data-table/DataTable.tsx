import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import type { Column, Density, Totals } from './types'

const ROW_HEIGHT: Record<Density, string> = { dense: 'h-6 text-table-dense stretch-dense', regular: 'h-7 text-table stretch-table', narrative: 'h-[34px] text-table stretch-table' }

type DataTableProps<T> = {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  noun: { singular: string; plural: string }
  total?: number
  density?: Density
  totals?: Totals
  onActivate?: (row: T) => void
  initialSort?: { id: string; desc: boolean }
}

export function DataTable<T>({
  caption, columns, rows, getRowId, noun, total, density = 'regular', totals, onActivate, initialSort,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ? [initialSort] : [])
  const [active, setActive] = useState(0)
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

  const moveTo = (index: number) => {
    const next = Math.max(0, Math.min(shown - 1, index))
    setActive(next)
    rowRefs.current[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); moveTo(index + 1) }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); moveTo(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); moveTo(0) }
    else if (e.key === 'End') { e.preventDefault(); moveTo(shown - 1) }
    else if (e.key === 'Enter' && onActivate) { e.preventDefault(); const r = sorted[index]; if (r) onActivate(r.original) }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="min-w-0 overflow-x-auto" data-scroll="table">
        <table className="min-w-full border-collapse">
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
                      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}
                      className={cn('whitespace-nowrap px-2 py-2 text-label uppercase text-ink-2', col?.align === 'right' ? 'text-right' : 'text-left')}
                    >
                      {header.column.getCanSort() ? (
                        <button type="button" className="uppercase" onClick={header.column.getToggleSortingHandler()}>
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
              <tr><td colSpan={columns.length} className="px-2 py-3 text-body text-ink-3">No {noun.plural}.</td></tr>
            ) : sorted.map((row, i) => (
              <tr
                key={row.id}
                ref={(el) => { rowRefs.current[i] = el }}
                tabIndex={i === active ? 0 : -1}
                onFocus={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onClick={onActivate ? () => onActivate(row.original) : undefined}
                className={cn('border-b border-rule focus-visible:bg-band', ROW_HEIGHT[density])}
              >
                {row.getVisibleCells().map((cell) => {
                  const col = byId.get(cell.column.id)
                  const p = col?.proportion?.(row.original)
                  return (
                    <td key={cell.id} className={cn('whitespace-nowrap px-2', col?.align === 'right' ? 'text-right tabular' : 'text-left')}>
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
                        {totals.tiesTo ? <span className="text-label font-normal text-ink-3">ties to {totals.tiesTo}</span> : null}
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
