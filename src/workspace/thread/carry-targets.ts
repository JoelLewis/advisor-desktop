import type { Subject, Thread } from '@/types/workspace'

/**
 * The team threads a Brief finding can go to: the ones about the same subject, and every team thread about the household
 * that holds the Brief's account (its meeting thread, or one started from the household page), each offered under its own
 * title. Only threads the viewer is a member of.
 */
export function carryTargets(threads: readonly Thread[], viewerId: string, subject: Subject | undefined, householdId: string | undefined): Thread[] {
  if (!subject) return []
  const mine = threads.filter((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId))
  const team = mine.filter((t) => t.subject?.type === subject.type && t.subject.id === subject.id)
  const aboutHousehold = householdId === undefined ? []
    : mine.filter((t) => t.subject?.type === 'household' && t.subject.id === householdId)
  return [...team, ...aboutHousehold]
}
