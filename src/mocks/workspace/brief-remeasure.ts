import type { Message } from '@/types/workspace'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { nextAt, sessionNow, store } from '@/mocks/data/workspace-store'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { easternDayOf } from '@/lib/eastern-day'
import { composeBrief } from './brief'
import { BRIEF_THREAD_ID } from '@/lib/brief-thread'

/** Whether the Brief's findings still measure the book as it stands on the session's day: no fill has moved it and the day has not changed. */
export function briefIsCurrent(): boolean {
  const { book, day } = store().briefMeasured
  return book === bookVersion() && day === easternDayOf(sessionNow())
}

/** The id prefix of a re-measure: the book version, and the day when it is not the frozen day. */
export function remeasurePrefix(letter: string): string {
  const day = easternDayOf(sessionNow())
  return `msg-${letter}${bookVersion()}${day === MOCK_TODAY_ISO ? '' : `-${day.slice(5).replace('-', '')}`}`
}

/**
 * The Brief re-measures on view: once fills have moved the book, or the session has moved to another day, since its
 * findings were measured, they and the summary are composed again and replace the earlier ones, so nothing said
 * "today" outlives its day. Carried cards in team threads keep their own quotation of what the Brief said when they
 * were carried.
 */
export function remeasureBrief(): void {
  if (briefIsCurrent()) return
  const s = store()
  const prefix = remeasurePrefix('r')
  const measured = composeBrief((i) => `${prefix}-${String(i).padStart(2, '0')}`, nextAt())
  s.messages = [
    ...s.messages.filter((m) => m.threadId !== BRIEF_THREAD_ID || (m.kind !== 'agent_finding' && m.kind !== 'brief_summary')),
    ...measured,
  ]
  s.briefMeasured = { book: bookVersion(), day: easternDayOf(sessionNow()) }
}

const isMeasured = (m: Message) => m.kind === 'brief_summary' || m.kind === 'agent_finding'
const byTime = (a: Message, b: Message) => a.at.localeCompare(b.at)

/**
 * The Brief reads as measured: its summary and findings first, then anything posted in it, in time order.
 * Today is composed on read and leads it (the thread handler).
 */
export function briefOrder(messages: readonly Message[]): Message[] {
  return [...messages.filter(isMeasured).sort(byTime), ...messages.filter((m) => !isMeasured(m)).sort(byTime)]
}
