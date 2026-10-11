import type { Thread } from '@/types/workspace'
import { can, personById } from '@/mocks/data/people'
import { store } from '@/mocks/data/workspace-store'

export function canSeeThread(viewerId: string, thread: Thread): boolean {
  const viewer = personById(viewerId)
  if (!viewer) return false
  if (viewer.role === 'client') return thread.visibility === 'client' && thread.clientId === viewer.id
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
