import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
  type Row,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  searchValue?: string
  searchColumn?: string
  expandedContent?: (row: Row<T>) => React.ReactNode
  onRowClick?: (row: T) => void
  emptyMessage?: string
  compact?: boolean
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  searchValue,
  searchColumn,
  expandedContent,
  onRowClick,
  emptyMessage = 'No data',
  compact = false,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded, globalFilter: searchValue },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: expandedContent ? getExpandedRowModel() : undefined,
    getRowCanExpand: expandedContent ? () => true : undefined,
    globalFilterFn: searchColumn
      ? (row, _columnId, filterValue: string) => {
          const cellValue = row.getValue(searchColumn)
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase())
        }
      : undefined,
  })

  return (
    <div className={cn('overflow-auto scrollbar-thin', className)}>
      <table className="w-full border-collapse text-body">
        <thead className="sticky top-0 z-10 bg-surface-secondary">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {expandedContent && <th className="w-8" />}
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'border-b border-border-primary text-left text-caption font-semibold text-text-secondary',
                    compact ? 'px-3 py-2' : 'px-4 py-3',
                    header.column.getCanSort() && 'cursor-pointer select-none hover:text-text-primary',
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="text-text-tertiary">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (expandedContent ? 1 : 0)}
                className="py-12 text-center text-caption text-text-tertiary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <>
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border-primary transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-tertiary',
                    row.getIsExpanded() && 'bg-surface-tertiary/50',
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {expandedContent && (
                    <td className={cn(compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
                      <button
                        onClick={(e) => { e.stopPropagation(); row.toggleExpanded() }}
                        className="rounded p-0.5 text-text-tertiary hover:text-text-primary"
                      >
                        {row.getIsExpanded()
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </button>
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(compact ? 'px-3 py-1.5' : 'px-4 py-3')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expandedContent && row.getIsExpanded() && (
                  <tr key={`${row.id}-expanded`}>
                    <td colSpan={columns.length + 1} className="border-b border-border-primary bg-surface-secondary p-4">
                      {expandedContent(row)}
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
