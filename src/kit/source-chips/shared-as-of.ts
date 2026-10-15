import type { Source } from './SourceChips'

/** The as-of every source states, when they all state the same one; otherwise each chip says its own. */
export function sharedAsOf(sources: readonly Source[]): string | undefined {
  const [first] = sources
  if (first?.asOf === undefined) return undefined
  return sources.every((s) => s.asOf === first.asOf) ? first.asOf : undefined
}
