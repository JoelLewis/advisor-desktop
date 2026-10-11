import type { BindingAct, Message } from '@/types/workspace'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { canSeeThread } from './visibility'

type Failure = { ok: false; status: 403 | 404 | 409; code: string; message: string }

export function sendToClient(viewerId: string, draftId: string): { ok: true; act: BindingAct } | Failure {
  const s = store()
  const draft = s.drafts.find((d) => d.id === draftId)
  if (!draft) {
    const sent = s.acts.find((a) => a.kind === 'send_to_client' && a.subject?.type === 'draft' && a.subject.id === draftId)
    return sent
      ? { ok: false, status: 409, code: 'ALREADY_SENT', message: `This draft was already sent (${sent.id}).` }
      : { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  }
  const thread = s.threads.find((t) => t.id === draft.clientThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (!can(viewerId, 'send_to_client')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can send to a client.' }

  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_client', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body),
    summary: 'Message sent to the client',
  }
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewerId, at, body: draft.body }
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: thread.id, at: nextAt(), actId: act.id }
  s.acts.push(act)
  s.messages.push(text, marker)
  s.drafts = s.drafts.filter((d) => d.id !== draftId)
  return { ok: true, act }
}
