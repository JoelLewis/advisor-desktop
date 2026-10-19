import { addressNameOf } from '@/lib/words'
import type { ConversationAudience } from '@/types/workspace'

type ConversationChoice = { value: string; label: string; audience: ConversationAudience }

/** Who a new conversation is for, in the Phase 9 words: Just me, the Larkfield team, or a client conversation with one member. */
export function conversationChoices(members: readonly { clientId: string; name: string }[]): ConversationChoice[] {
  return [
    { value: 'private', label: 'Just me', audience: { kind: 'private' } },
    { value: 'internal', label: 'Larkfield team', audience: { kind: 'internal' } },
    ...members.map((m) => ({ value: `client:${m.clientId}`, label: `Client conversation with ${addressNameOf(m.name)}`, audience: { kind: 'client' as const, clientId: m.clientId } })),
  ]
}
