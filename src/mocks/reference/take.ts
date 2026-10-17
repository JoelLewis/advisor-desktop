import type { Message, Subject, Thread } from '@/types/workspace'
import type { ReferenceView, RowQuote } from '@/types/reference'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { rowQuote } from './quotes'

type ReferenceRowMessage = Extract<Message, { kind: 'reference_row' }>
export type TakeFailure = { ok: false; status: 403 | 404; code: string; message: string }
export type Taken = { ok: true; created: boolean; thread: Thread; message: ReferenceRowMessage }

/** A thread opened for a row is the taker's, the advisor's and client service's. */
const OPENED_WITH: readonly string[] = ['user-001', 'user-002']

const sameSubject = (a: Subject | undefined, b: Subject) => a !== undefined && a.type === b.type && a.id === b.id

function openThread(viewerId: string, quote: RowQuote): Thread {
  const thread: Thread = {
    id: `th-ref-${pad(nextNumber('thread'))}`, title: quote.threadTitle, visibility: 'internal',
    memberIds: [...new Set([viewerId, ...OPENED_WITH])], agentIds: [], subject: quote.subject,
  }
  store().threads.push(thread)
  return thread
}

/** The row, quoted into the first team thread about its subject the viewer is a member of (or one opened for it), once. */
export function takeToTeamThread(viewerId: string, view: ReferenceView, rowId: string): Taken | TakeFailure {
  if (!isFirmViewer(viewerId)) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Not found.' }
  if (!can(viewerId, 'post_firm')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only people who post in team threads can share a row to one.' }
  const quote = rowQuote(view, rowId)
  if (!quote) return { ok: false, status: 404, code: 'NO_ROW', message: 'That row is not in the view.' }
  const s = store()
  const thread = s.threads.find((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId) && sameSubject(t.subject, quote.subject)) ?? openThread(viewerId, quote)
  const existing = s.messages.find((m): m is ReferenceRowMessage => m.kind === 'reference_row' && m.threadId === thread.id && m.view === view && m.rowId === rowId)
  if (existing) return { ok: true, created: false, thread, message: existing }
  const message: ReferenceRowMessage = {
    kind: 'reference_row', id: nextId('msg'), threadId: thread.id, at: nextAt(), takenBy: viewerId, view, rowId,
    subject: quote.subject, claim: quote.claim, figures: quote.figures, citations: quote.citations,
  }
  s.messages.push(message)
  return { ok: true, created: true, thread, message }
}
