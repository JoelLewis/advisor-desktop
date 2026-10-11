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

export type TiesTo = { label: string; expected: number; actual: number }

export type Totals = { label: string; tiesTo?: TiesTo; cells: Partial<Record<string, ReactNode>> }
