import type { Directory, Thread } from '@/types/workspace'
import { addressNameOf } from '@/lib/words'
import { FIRM_SHORT_NAME } from '@/lib/firm'

export type ComposerMode =
  | { kind: 'post'; label: string; action: string }
  | { kind: 'draft'; partyName: string; addressName: string; canSend: boolean }
  | { kind: 'read-only' }

/**
 * What the viewer's composer does in this thread. Acts come from the engine's permissions; who belongs to
 * the thread comes from the thread record. The engine still enforces both on every write.
 */
export function composerModeOf(thread: Thread, viewerId: string, directory: Directory): ComposerMode {
  const acts = directory.permissions[viewerId] ?? []
  if (thread.visibility === 'client') {
    // The client or prospect writes to the firm, and the composer says so.
    if (thread.partyId === viewerId) return { kind: 'post', label: `Message to the ${FIRM_SHORT_NAME} team`, action: `Send to ${FIRM_SHORT_NAME}` }
    if (!acts.includes('draft_for_client')) return { kind: 'read-only' }
    const party = directory.people.find((p) => p.id === thread.partyId)
    if (!party) throw new Error(`The party of thread "${thread.id}" is not in the directory`)
    return { kind: 'draft', partyName: party.name, addressName: addressNameOf(party.name), canSend: acts.includes('send_to_party') }
  }
  const belongs = thread.memberIds.includes(viewerId) || thread.ownerId === viewerId
  if (!belongs || !acts.includes('post_firm')) return { kind: 'read-only' }
  return { kind: 'post', label: 'Message', action: thread.visibility === 'internal' ? 'Post to the team' : 'Post' }
}
