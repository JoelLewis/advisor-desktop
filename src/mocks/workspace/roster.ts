import { FIRM_SHORT_NAME } from '@/lib/firm'
import { personWithRole } from '@/lib/role-label'
import type { Thread } from '@/types/workspace'
import { PEOPLE, can, personById } from '@/mocks/data/people'
import { isExternalViewer } from './visibility'

/** What an outsider is told about compliance: that it reviews their messages, without a colleague's name. */
const OUTSIDER_COMPLIANCE_ENTRY = `${FIRM_SHORT_NAME} compliance (review)`

/**
 * Everyone who reads the thread, one name each, as its viewer may be told it: its members, then whoever supervises
 * every firm and client thread. A private thread is its owner's alone.
 */
export function rosterOf(thread: Thread, viewerId: string): string[] {
  const memberIds = [...new Set([...(thread.ownerId ? [thread.ownerId] : []), ...thread.memberIds])]
  const members = memberIds.map((id) => {
    const person = personById(id)
    if (!person) throw new Error(`Thread ${thread.id} names unknown member ${id}`)
    return personWithRole(person)
  })
  if (thread.visibility === 'private') return members
  if (isExternalViewer(viewerId)) return [...members, OUTSIDER_COMPLIANCE_ENTRY]
  const supervisors = PEOPLE.filter((p) => can(p.id, 'read_all_firm_threads') && !memberIds.includes(p.id))
  return [...members, ...supervisors.map((p) => `${p.name} · Compliance (supervision)`)]
}
