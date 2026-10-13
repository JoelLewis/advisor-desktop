import type { Message } from '@/types/workspace'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { nextAt, store } from '@/mocks/data/workspace-store'
import { BRIEF_THREAD_ID, composeBrief } from './brief'

/**
 * The Brief re-measures on view: once fills have moved the book since its findings were measured,
 * they and the ranked summary are composed again and replace the earlier ones. Carried cards in
 * team threads keep their own quotation of what the Brief said when they were carried.
 */
export function remeasureBrief(): void {
  const s = store()
  const book = bookVersion()
  if (s.briefBook === book) return
  const measured = composeBrief((i) => `msg-r${book}-${String(i).padStart(2, '0')}`, nextAt())
  s.messages = [
    ...s.messages.filter((m) => m.threadId !== BRIEF_THREAD_ID || (m.kind !== 'agent_finding' && m.kind !== 'brief_summary')),
    ...measured,
  ]
  s.briefBook = book
}

const isMeasured = (m: Message) => m.kind === 'brief_summary' || m.kind === 'agent_finding'
const byTime = (a: Message, b: Message) => a.at.localeCompare(b.at)

/**
 * The Brief reads as it does in the morning whenever it was measured: the ranked summary and its
 * findings first, then the day's lines (the meeting notice) in time order. A re-measure stamps the
 * measured messages later than the seeded lines, so time order alone would lift those lines above them.
 */
export function briefOrder(messages: readonly Message[]): Message[] {
  return [...messages.filter(isMeasured).sort(byTime), ...messages.filter((m) => !isMeasured(m)).sort(byTime)]
}
