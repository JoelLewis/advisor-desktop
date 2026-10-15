import type { Subject, Thread, ThreadAudience } from '@/types/workspace'
import type { PartyKind } from '@/lib/external-party'
import { accounts } from '@/mocks/data/accounts'
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

/** The clients (or the prospect) a team thread is about, by full name: an account's owner, a household's clients, a client, a prospect. */
function outsidersAbout(subject: Subject | undefined): string[] {
  switch (subject?.type) {
    case 'account': {
      const account = accounts.find((a) => a.id === subject.id)
      const owner = account && clients.find((c) => c.id === account.clientId)
      if (!owner) throw new Error(`Account ${subject.id} names no client`)
      return [owner.fullName]
    }
    case 'household': return clients.filter((c) => c.householdId === subject.id).map((c) => c.fullName)
    case 'client':
    case 'prospect': {
      const party = partyOf(subject.id)
      if (!party) throw new Error(`No client or prospect ${subject.id}`)
      return [party.name]
    }
    default: return []
  }
}

export function audienceOf(thread: Thread): ThreadAudience {
  if (thread.visibility === 'private') return { kind: 'owner' }
  if (thread.visibility === 'client') return { kind: 'party', name: partyOfThread(thread).name }
  return { kind: 'team', about: outsidersAbout(thread.subject) }
}
