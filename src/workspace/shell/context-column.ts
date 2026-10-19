import type { ComponentType } from 'react'
import type { UIMatch } from 'react-router-dom'

/**
 * What a route puts in the shell's context column: a visible label, the column's content, and a hook
 * saying whether there is anything to show (a thread that is not found or failed to load has no context).
 */
export type ContextColumn = { label: string; Content: ComponentType; useAvailable: () => boolean }

/** A route's `handle` provides the context column, and may ask the shell to step the thread list aside for a full view. */
export type ShellHandle = { contextColumn?: ContextColumn; threadList?: 'hidden' }

const hasContextColumn = (handle: unknown): handle is { contextColumn: ContextColumn } =>
  typeof handle === 'object' && handle !== null && 'contextColumn' in handle && handle.contextColumn !== undefined

const hidesThreadList = (handle: unknown): boolean =>
  typeof handle === 'object' && handle !== null && 'threadList' in handle && handle.threadList === 'hidden'

/** The deepest matched route's context column, if any, with the id of the route that provides it. */
export function contextColumnOf(matches: readonly UIMatch[]): { routeId: string; column: ContextColumn } | undefined {
  const provided = matches.flatMap((m) => (hasContextColumn(m.handle) ? [{ routeId: m.id, column: m.handle.contextColumn }] : []))
  return provided[provided.length - 1]
}

export function threadListHidden(matches: readonly UIMatch[]): boolean {
  return matches.some((m) => hidesThreadList(m.handle))
}
