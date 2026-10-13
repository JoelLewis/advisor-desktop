import type { BindingAct, Thread } from '@/types/workspace'
import type { Archive, ArchiveEntry, ArchiveFilters, ArchiveKind } from '@/types/workspace-supervision'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { proposalById } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { alertById, alertContext } from './alerts'
import { sentMessage } from './correspondence'
import { canSeeThread } from './visibility'

export const ARCHIVE_KINDS: readonly ArchiveKind[] = [
  'approve_proposal', 'withdraw_approval', 'send_to_client', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence', 'sent_message',
]
export const isArchiveKind = (value: string): value is ArchiveKind => (ARCHIVE_KINDS as readonly string[]).includes(value)

/** Code-unit order, the same on every machine. */
const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const clientName = (id: string | undefined) => clients.find((c) => c.id === id)?.fullName

/** The thread an act belongs to: where it was recorded, or for a correspondence review, the message's client thread. */
function threadOf(act: BindingAct): Thread | undefined {
  const id = act.threadId ?? (act.subject?.type === 'message' ? sentMessage(act.subject.id)?.thread.id : undefined)
  return id === undefined ? undefined : store().threads.find((t) => t.id === id)
}

function clientOf(act: BindingAct, thread: Thread | undefined): string | undefined {
  if (act.subject?.type === 'proposal') return proposalById(act.subject.id)?.clientId
  if (act.subject?.type === 'alert') {
    const alert = alertById(act.subject.id)
    return alert ? alertContext(alert).clientId : undefined
  }
  return thread?.clientId
}

function entriesOf(act: BindingAct): ArchiveEntry[] {
  const thread = threadOf(act)
  const clientId = clientOf(act, thread)
  const name = clientName(clientId)
  const entry: ArchiveEntry = {
    kind: 'act', id: act.id, at: act.at, act,
    ...(clientId ? { clientId } : {}), ...(name ? { clientName: name } : {}),
    ...(thread ? { threadId: thread.id, threadTitle: thread.title } : {}),
  }
  const sent = act.kind === 'send_to_client' && act.messageId ? sentMessage(act.messageId) : undefined
  const sentClient = sent?.thread.clientId
  if (!sent || !sentClient) return [entry]
  return [entry, {
    kind: 'sent_message', id: sent.message.id, at: sent.message.at, message: sent.message, actId: act.id, fingerprint: act.fingerprint,
    clientId: sentClient, clientName: clientName(sentClient) ?? sent.thread.title, threadId: sent.thread.id, threadTitle: sent.thread.title,
  }]
}

const kindOf = (e: ArchiveEntry): ArchiveKind => (e.kind === 'act' ? e.act.kind : 'sent_message')

/** The books-and-records surface: every act and sent client message the viewer may read, in order, filtered. */
export function archiveFor(viewerId: string, filters: ArchiveFilters): Archive | undefined {
  const viewer = personById(viewerId)
  if (!viewer || viewer.role === 'client') return undefined
  const readable = (act: BindingAct) => {
    const thread = threadOf(act)
    return thread ? canSeeThread(viewerId, thread) : act.kind === 'dispose_alert'
  }
  const all = store().acts.filter(readable).flatMap(entriesOf).sort((a, b) => byCodeUnit(a.at, b.at) || byCodeUnit(a.id, b.id))
  const day = (e: ArchiveEntry) => e.at.slice(0, 10)
  const entries = all.filter((e) => (filters.clientId === undefined || e.clientId === filters.clientId)
    && (filters.kind === undefined || kindOf(e) === filters.kind)
    && (filters.from === undefined || day(e) >= filters.from)
    && (filters.to === undefined || day(e) <= filters.to))
  const named = new Map(all.flatMap((e) => (e.clientId && e.clientName ? [[e.clientId, e.clientName] as const] : [])))
  return {
    entries,
    clients: [...named].map(([id, name]) => ({ id, name })).sort((a, b) => byCodeUnit(a.name, b.name)),
    dates: [...new Set(all.map(day))].sort(byCodeUnit),
  }
}
