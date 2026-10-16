import { FIRM_SHORT_NAME } from '@/lib/firm'
import type { Directory, Thread } from '@/types/workspace'
import { personIn } from './directory-people'
import { personWithRole } from './role-label'

export const OUTSIDER_THREAD_TITLE = `Your conversation with ${FIRM_SHORT_NAME}`

/**
 * Everyone who reads the thread, one name each: its members, then compliance, who supervises every firm and client
 * thread. An outsider is told compliance reviews their messages, without being handed a colleague's name.
 */
export function rosterOf(thread: Thread, directory: Directory, viewerIsExternal: boolean): string[] {
  const memberIds = [...new Set([...(thread.ownerId ? [thread.ownerId] : []), ...thread.memberIds])]
  const members = memberIds.map((id) => personWithRole(personIn(directory, id)))
  if (thread.visibility === 'private') return members
  if (viewerIsExternal) return [...members, `${FIRM_SHORT_NAME} compliance (review)`]
  const supervisors = directory.people.filter((p) => p.role === 'compliance' && !memberIds.includes(p.id))
  return [...members, ...supervisors.map((p) => `${p.name} · Compliance (supervision)`)]
}

/** The thread's title as its viewer reads it: an outsider's own conversation is addressed to them. */
export const threadTitleFor = (thread: Thread, viewerIsExternal: boolean): string => (viewerIsExternal ? OUTSIDER_THREAD_TITLE : thread.title)
