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
  /** Text in this column may wrap; the row grows to fit. */
  wrap?: boolean
}

/**
 * A single key that acts on the focused row, kept from reaching the page's own shortcuts. The
 * table's own keys (arrows, J/K, Home, End, Enter) win over a binding, modifier chords never
 * match, and `key` is matched case-sensitively against `KeyboardEvent.key` ('x' is not 'X').
 */
export type RowKey<T> = { key: string; run: (row: T) => void }

export type TiesTo = { label: string; expected: number; actual: number }

export type Totals = { label: string; tiesTo?: TiesTo; cells: Partial<Record<string, ReactNode>> }
