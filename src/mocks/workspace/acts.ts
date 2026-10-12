import type { BindingAct, Message } from '@/types/workspace'
import { can, personById } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { isDraftStale } from '@/mocks/data/proposals-store'
import { canSeeThread } from './visibility'

type Failure = { ok: false; status: 403 | 404 | 409; code: string; message: string }

export function sendToClient(viewerId: string, draftId: string): { ok: true; act: BindingAct } | Failure {
  const s = store()
  const isClient = personById(viewerId)?.role === 'client'
  const noDraft: Failure = { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (isClient) return noDraft
  const draft = s.drafts.find((d) => d.id === draftId)
  if (!draft) {
    const sent = s.acts.find((a) => a.kind === 'send_to_client' && a.subject?.type === 'draft' && a.subject.id === draftId)
    const sentThread = sent && s.threads.find((t) => t.id === sent.threadId)
    return sent && sentThread && canSeeThread(viewerId, sentThread)
      ? { ok: false, status: 409, code: 'ALREADY_SENT', message: `This draft was already sent (${sent.id}).` }
      : noDraft
  }
  const thread = s.threads.find((t) => t.id === draft.clientThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return noDraft
  if (!can(viewerId, 'send_to_client')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can send to a client.' }
  if (isDraftStale(draft)) {
    return { ok: false, status: 409, code: 'STALE_DRAFT', message: `This letter was drafted from v${draft.basis?.version ?? 0}, which is no longer the approved version. Ask for a new letter.` }
  }

  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_client', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body),
    summary: 'Message sent to the client',
    // Books and records: an agent's letter records the approved version it came from and every person who edited it.
    ...(draft.agentId ? { basis: draft.basis, editedBy: draft.editorIds ?? [] } : {}),
  }
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewerId, at, body: draft.body }
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: thread.id, at: nextAt(), actId: act.id }
  s.acts.push(act)
  s.messages.push(text, marker)
  s.drafts = s.drafts.filter((d) => d.id !== draftId)
  return { ok: true, act }
}
