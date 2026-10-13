import type { PartyKind } from '@/lib/external-party'
import type { Thread } from '@/types/workspace'

/** Whose work a thread is: a prospect's (her thread and its internal sibling) or, for every other thread, a client's. The band's words follow it. */
export const threadParty = (thread: Thread): PartyKind => (thread.subject?.type === 'prospect' ? 'prospect' : 'client')
