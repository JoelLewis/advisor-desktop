import { addressNameOf, joinWords } from '@/lib/words'
import type { Draft } from '@/types/workspace'

/** The send button, naming everyone the letter reaches as a button addresses them: "Send to Robert and Patricia". */
export const sendLabelOf = (partyName: string, draft: Pick<Draft, 'copies'>): string =>
  `Send to ${joinWords([partyName, ...(draft.copies ?? []).map((c) => c.partyName)].map(addressNameOf))}`
