import type { ComponentType } from 'react'
import type { UIMatch } from 'react-router-dom'

/** What a route puts in the shell's context column: a visible label and the column's content. */
export type ContextColumn = { label: string; Content: ComponentType }

/** A route's `handle` provides the context column; routes without one leave the column out. */
export type ShellHandle = { contextColumn?: ContextColumn }

const hasContextColumn = (handle: unknown): handle is Required<ShellHandle> =>
  typeof handle === 'object' && handle !== null && 'contextColumn' in handle && handle.contextColumn !== undefined

/** The deepest matched route's context column, if any. */
export function contextColumnOf(matches: readonly UIMatch[]): ContextColumn | undefined {
  const provided = matches.map((m) => m.handle).filter(hasContextColumn)
  return provided[provided.length - 1]?.contextColumn
}
