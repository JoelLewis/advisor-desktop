import type { AgentId, Subject } from '@/types/workspace'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { MOCK_NOW_ISO } from '@/lib/clock'

/**
 * One agent run: the same agent, thread, subject and as-of always find the same thing — until the
 * session's fills move the book, or (for a prospect) what is on file about her changes; then it is a new run.
 */
export const runKeyOf = (agentId: AgentId, threadId: string, subject: Subject, revision?: number): string => {
  const book = bookVersion()
  return `${agentId}|${threadId}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}${book > 0 ? `|book ${book}` : ''}${revision === undefined ? '' : `|on file ${revision}`}`
}
