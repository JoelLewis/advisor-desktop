import type { Thread } from '@/types/workspace'
import type { PartyKind } from '@/lib/external-party'
import { clients } from '@/mocks/data/clients'
import { prospects } from '@/mocks/data/prospects'

export type Party = { id: string; kind: PartyKind; name: string }

/** A client from the CRM's clients, a prospect from its prospects. */
export function partyOf(partyId: string): Party | undefined {
  const client = clients.find((c) => c.id === partyId)
  if (client) return { id: client.id, kind: 'client', name: client.fullName }
  const prospect = prospects.find((p) => p.id === partyId)
  return prospect ? { id: prospect.id, kind: 'prospect', name: prospect.name } : undefined
}

/** The party an external-visible thread is with. Such a thread always names one. */
export function partyOfThread(thread: Thread): Party {
  const party = thread.partyId === undefined ? undefined : partyOf(thread.partyId)
  if (!party) throw new Error(`Thread ${thread.id} names no known party`)
  return party
}
