import type { Directory, Thread } from '@/types/workspace'
import { addressNameOf } from '@/lib/words'

export type ComposerMode =
  | { kind: 'post'; action: 'Post' | 'Send' }
  | { kind: 'draft'; addressName: string }
  | { kind: 'read-only' }

/**
 * What the viewer's composer does in this thread. Acts come from the engine's permissions; who belongs to
 * the thread comes from the thread record. The engine still enforces both on every write.
 */
export function composerModeOf(thread: Thread, viewerId: string, directory: Directory): ComposerMode {
  const acts = directory.permissions[viewerId] ?? []
  if (thread.visibility === 'client') {
    if (thread.partyId === viewerId) return { kind: 'post', action: 'Send' }
    if (!acts.includes('draft_for_client')) return { kind: 'read-only' }
    const party = directory.people.find((p) => p.id === thread.partyId)
    if (!party) throw new Error(`The party of thread "${thread.id}" is not in the directory`)
    return { kind: 'draft', addressName: addressNameOf(party.name) }
  }
  const belongs = thread.memberIds.includes(viewerId) || thread.ownerId === viewerId
  return belongs && acts.includes('post_firm') ? { kind: 'post', action: 'Post' } : { kind: 'read-only' }
}
