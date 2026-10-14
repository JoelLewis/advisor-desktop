import type { Subject, Thread } from '@/types/workspace'

export type CarryTarget = { thread: Thread; kind: 'team' | 'meeting' }

/**
 * The team threads a Brief finding can go to: the one about the same subject, and the meeting thread of
 * the household that holds the Brief's account. Only threads the viewer is a member of.
 */
export function carryTargets(threads: readonly Thread[], viewerId: string, subject: Subject | undefined, householdId: string | undefined): CarryTarget[] {
  if (!subject) return []
  const mine = threads.filter((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId))
  const team = mine.filter((t) => t.subject?.type === subject.type && t.subject.id === subject.id).map((thread) => ({ thread, kind: 'team' as const }))
  const meetings = householdId === undefined ? []
    : mine.filter((t) => t.subject?.type === 'household' && t.subject.id === householdId).map((thread) => ({ thread, kind: 'meeting' as const }))
  return [...team, ...meetings]
}
