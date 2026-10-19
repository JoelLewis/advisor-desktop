import type { AgentId, Subject } from '@/types/workspace'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { sessionNow } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { easternDayOf } from '@/lib/eastern-day'

/** The session's New York day, when the presenter has moved past the frozen day; none on the frozen day itself. */
const laterDay = (): string | undefined => {
  const day = easternDayOf(sessionNow())
  return day === MOCK_TODAY_ISO ? undefined : day
}

/** When a run measures: the calculations' as-of on the frozen day, the session clock once the presenter has moved to a later day. */
export const runAsOf = (): string => (laterDay() === undefined ? MOCK_NOW_ISO : sessionNow())

/**
 * One agent run: the same agent, thread, subject and as-of always find the same thing — until the session's fills
 * move the book, the presenter moves to a later day, or (for a prospect) what is on file about her changes; then it
 * is a new run.
 */
export const runKeyOf = (agentId: AgentId, threadId: string, subject: Subject, revision?: number): string => {
  const book = bookVersion()
  const day = laterDay()
  return `${agentId}|${threadId}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}${book > 0 ? `|book ${book}` : ''}${day === undefined ? '' : `|day ${day}`}${revision === undefined ? '' : `|on file ${revision}`}`
}
