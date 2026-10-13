import type { Thread } from '@/types/workspace'
import { can, personById } from '@/mocks/data/people'
import { store } from '@/mocks/data/workspace-store'
import { isExternalRole } from '@/lib/external-party'

/** A client or a prospect: a party outside the firm, who sees only their own thread. */
export function isExternalViewer(viewerId: string): boolean {
  const viewer = personById(viewerId)
  return viewer !== undefined && isExternalRole(viewer.role)
}

/** A known person inside the firm. Firm surfaces admit only these; anyone else is told they do not exist. */
export function isFirmViewer(viewerId: string): boolean {
  const viewer = personById(viewerId)
  return viewer !== undefined && !isExternalRole(viewer.role)
}

export function canSeeThread(viewerId: string, thread: Thread): boolean {
  const viewer = personById(viewerId)
  if (!viewer) return false
  if (isExternalRole(viewer.role)) return thread.visibility === 'client' && thread.partyId === viewer.id
  if (thread.visibility === 'private') return thread.ownerId === viewer.id
  if (can(viewer.id, 'read_all_firm_threads')) return true
  return thread.memberIds.includes(viewer.id)
}

export function visibleThreads(viewerId: string): Thread[] {
  return store().threads.filter((t) => canSeeThread(viewerId, t))
}

export function viewerFrom(request: Request): string | undefined {
  const id = request.headers.get('X-Viewer') ?? undefined
  return id && personById(id) ? id : undefined
}
