import type { ReactNode } from 'react'

export type Density = 'dense' | 'regular' | 'narrative'

export type Column<T> = {
  id: string
  header: string
  unit?: string
  align?: 'left' | 'right'
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
  proportion?: (row: T) => number
}

export type Totals = { label: string; tiesTo?: string; cells: Partial<Record<string, ReactNode>> }
