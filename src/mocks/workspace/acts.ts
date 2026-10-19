import type { BindingAct, Message } from '@/types/workspace'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { isStale, staleMessage } from './draft-staleness'
import { canSeeThread, isFirmViewer } from './visibility'
import { partyOfThread } from './party'
import { joinWords } from '@/lib/words'

type Failure = { ok: false; status: 403 | 404 | 409; code: string; message: string }

export function sendToParty(viewerId: string, draftId: string): { ok: true; act: BindingAct } | Failure {
  const s = store()
  const noDraft: Failure = { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (!isFirmViewer(viewerId)) return noDraft
  const draft = s.drafts.find((d) => d.id === draftId)
  if (!draft) {
    const sent = s.acts.find((a) => a.kind === 'send_to_party' && a.subject?.type === 'draft' && a.subject.id === draftId)
    const sentThread = sent && s.threads.find((t) => t.id === sent.threadId)
    return sent && sentThread && canSeeThread(viewerId, sentThread)
      ? { ok: false, status: 409, code: 'ALREADY_SENT', message: `This draft was already sent (${sent.id}).` }
      : noDraft
  }
  const thread = s.threads.find((t) => t.id === draft.clientThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return noDraft
  if (!can(viewerId, 'send_to_party')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can send to a client or prospect.' }
  if (isStale(draft)) return { ok: false, status: 409, code: 'STALE_DRAFT', message: staleMessage(draft) }
  const party = partyOfThread(thread)

  const copies = (draft.copies ?? []).map((c) => {
    const copy = s.threads.find((t) => t.id === c.threadId)
    if (!copy || copy.visibility !== 'client' || !canSeeThread(viewerId, copy)) throw new Error(`Draft ${draft.id} names a copy to ${c.threadId}, which is not a client conversation the sender can see`)
    return copy
  })
  const at = nextAt()
  const texts = [thread, ...copies].map((t): Message => ({ kind: 'text', id: nextId('msg'), threadId: t.id, authorId: viewerId, at, body: draft.body }))
  const deliveries = texts.map((m) => ({ threadId: m.threadId, messageId: m.id }))
  const parties = [party, ...copies.map(partyOfThread)]
  const [first] = deliveries
  if (!first) throw new Error(`Send of ${draft.id} delivered nothing`)
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_party', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body), messageId: first.messageId,
    summary: parties.length === 1 ? `Message sent to the ${party.kind}` : `Message sent to ${joinWords(parties.map((p) => p.name))}`,
    ...(deliveries.length > 1 ? { deliveries } : {}),
    // Books and records: an agent's letter records what it came from (an approved version or a filed record) and every person who edited it.
    ...(draft.agentId ? {
      ...(draft.basis ? { basis: draft.basis } : {}),
      ...(draft.recordBasis ? { recordBasis: draft.recordBasis } : {}),
      editedBy: draft.editorIds ?? [],
    } : {}),
  }
  const markers = deliveries.map((d): Message => ({ kind: 'act', id: nextId('msg'), threadId: d.threadId, at: nextAt(), actId: act.id }))
  s.acts.push(act)
  s.messages.push(...texts, ...markers)
  s.drafts = s.drafts.filter((d) => d.id !== draftId)
  return { ok: true, act }
}
