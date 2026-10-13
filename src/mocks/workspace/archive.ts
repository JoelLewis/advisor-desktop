import type { BindingAct, Thread } from '@/types/workspace'
import type { Archive, ArchiveEntry, ArchiveFilters, ArchiveKind } from '@/types/workspace-supervision'
import { proposalById } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { prospectProposalById } from './prospect-proposals'
import { alertById, alertContext } from './alerts'
import { sentMessage } from './correspondence'
import { meetingEvent } from './meetings'
import { canSeeThread, isFirmViewer } from './visibility'
import { partyOf } from './party'

export { ARCHIVE_KINDS, isArchiveKind } from '@/types/workspace-supervision'

/** Code-unit order, the same on every machine. */
const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const partyName = (id: string | undefined) => (id === undefined ? undefined : partyOf(id)?.name)

/** The thread an act belongs to: where it was recorded, or for a correspondence review, the message's client thread. */
function threadOf(act: BindingAct): Thread | undefined {
  const id = act.threadId ?? (act.subject?.type === 'message' ? sentMessage(act.subject.id)?.thread.id : undefined)
  return id === undefined ? undefined : store().threads.find((t) => t.id === id)
}

function partyIdOf(act: BindingAct, thread: Thread | undefined): string | undefined {
  if (act.subject?.type === 'proposal') return proposalById(act.subject.id)?.clientId
  if (act.subject?.type === 'prospect_proposal') return prospectProposalById(act.subject.id)?.prospectId
  if (act.subject?.type === 'prospect') return act.subject.id
  if (act.subject?.type === 'alert') {
    const alert = alertById(act.subject.id)
    return alert ? alertContext(alert).clientId : undefined
  }
  if (act.subject?.type === 'meeting') return meetingEvent(act.subject.id)?.clientId
  return thread?.partyId
}

function entriesOf(act: BindingAct): ArchiveEntry[] {
  const thread = threadOf(act)
  const partyId = partyIdOf(act, thread)
  const name = partyName(partyId)
  const entry: ArchiveEntry = {
    kind: 'act', id: act.id, at: act.at, act,
    ...(partyId ? { partyId } : {}), ...(name ? { partyName: name } : {}),
    ...(thread ? { threadId: thread.id, threadTitle: thread.title } : {}),
  }
  const sent = act.kind === 'send_to_party' && act.messageId ? sentMessage(act.messageId) : undefined
  const sentParty = sent?.thread.partyId
  if (!sent || !sentParty) return [entry]
  return [entry, {
    kind: 'sent_message', id: sent.message.id, at: sent.message.at, message: sent.message, actId: act.id, fingerprint: act.fingerprint,
    partyId: sentParty, partyName: partyName(sentParty) ?? sent.thread.title, threadId: sent.thread.id, threadTitle: sent.thread.title,
  }]
}

const kindOf = (e: ArchiveEntry): ArchiveKind => (e.kind === 'act' ? e.act.kind : 'sent_message')

/** The books-and-records surface: every act and sent message the viewer may read, in order, filtered. */
export function archiveFor(viewerId: string, filters: ArchiveFilters): Archive | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const readable = (act: BindingAct) => {
    const thread = threadOf(act)
    return thread ? canSeeThread(viewerId, thread) : act.kind === 'dispose_alert'
  }
  const all = store().acts.filter(readable).flatMap(entriesOf).sort((a, b) => byCodeUnit(a.at, b.at) || byCodeUnit(a.id, b.id))
  const day = (e: ArchiveEntry) => e.at.slice(0, 10)
  const entries = all.filter((e) => (filters.partyId === undefined || e.partyId === filters.partyId)
    && (filters.kind === undefined || kindOf(e) === filters.kind)
    && (filters.from === undefined || day(e) >= filters.from)
    && (filters.to === undefined || day(e) <= filters.to))
  const named = new Map(all.flatMap((e) => (e.partyId && e.partyName ? [[e.partyId, e.partyName] as const] : [])))
  return {
    entries,
    parties: [...named].map(([id, name]) => ({ id, name })).sort((a, b) => byCodeUnit(a.name, b.name)),
    dates: [...new Set(all.map(day))].sort(byCodeUnit),
  }
}
