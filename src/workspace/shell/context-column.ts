import type { ComponentType } from 'react'
import type { UIMatch } from 'react-router-dom'

/**
 * What a route puts in the shell's context column: a visible label, the column's content, and a hook
 * saying whether there is anything to show (a thread that is not found or failed to load has no context).
 */
export type ContextColumn = { label: string; Content: ComponentType; useAvailable: () => boolean }

/** A route's `handle` provides the context column; routes without one leave the column out. */
export type ShellHandle = { contextColumn?: ContextColumn }

const hasContextColumn = (handle: unknown): handle is Required<ShellHandle> =>
  typeof handle === 'object' && handle !== null && 'contextColumn' in handle && handle.contextColumn !== undefined

/** The deepest matched route's context column, if any, with the id of the route that provides it. */
export function contextColumnOf(matches: readonly UIMatch[]): { routeId: string; column: ContextColumn } | undefined {
  const provided = matches.flatMap((m) => (hasContextColumn(m.handle) ? [{ routeId: m.id, column: m.handle.contextColumn }] : []))
  return provided[provided.length - 1]
}
