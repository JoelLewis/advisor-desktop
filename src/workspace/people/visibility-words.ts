import { FIRM_SHORT_NAME } from '@/lib/firm'
import { addressNameOf, joinWords } from '@/lib/words'
import type { Directory, Thread, ThreadAudience, Visibility } from '@/types/workspace'

/** The thread list's groups, named for who reads the threads in them. Prospects' threads sit with the clients'. */
export const THREAD_GROUP_TITLE: Readonly<Record<Visibility, string>> = {
  private: 'Just me', internal: `${FIRM_SHORT_NAME} team`, client: 'Client conversations',
}

export const JUST_YOU = 'Just you'

/** What a client or a prospect is told about who reads their conversation: the whole truth, compliance included. */
export const OUTSIDER_BAND = `You and the ${FIRM_SHORT_NAME} team. Messages are kept and reviewed by compliance, as the law requires.`

/** A team band, naming the clients who cannot read it as a button would address them. */
export const teamWords = (about: readonly string[]): string =>
  about.length === 0 ? `${FIRM_SHORT_NAME} team · no client can see this` : `${FIRM_SHORT_NAME} team · ${joinWords(about.map(addressNameOf))} can't see this`

export const partyWords = (fullName: string): string => `${fullName} can read this`

export function bandWordsOf(audience: ThreadAudience, viewerIsExternal: boolean): string {
  switch (audience.kind) {
    case 'owner': return JUST_YOU
    case 'team': return teamWords(audience.about)
    case 'party': return viewerIsExternal ? OUTSIDER_BAND : partyWords(audience.name)
  }
}

/** The thread list row's description for a screen reader: its group's words, naming the party of a client thread. */
export function rowWordsOf(thread: Thread, directory: Directory, viewerIsExternal: boolean): string {
  if (thread.visibility === 'private') return JUST_YOU
  if (thread.visibility === 'internal') return THREAD_GROUP_TITLE.internal
  if (viewerIsExternal) return OUTSIDER_BAND
  const party = directory.people.find((p) => p.id === thread.partyId)
  if (!party) throw new Error(`The party of thread "${thread.id}" is not in the directory`)
  return partyWords(party.name)
}
