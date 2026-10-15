import type { Message } from '@/types/workspace'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { canSeeThread } from './visibility'

type Carried = Extract<Message, { kind: 'carried' }>
type Finding = Extract<Message, { kind: 'agent_finding' }>
type Failure = { ok: false; status: 400 | 403 | 404; code: string; message: string }

/** The owner of a brief takes one of its findings to a team thread, as a quoted card. Repeating it returns the same card. */
export function carryFinding(viewerId: string, fromThreadId: string, findingId: string, toThreadId: string): { ok: true; message: Carried; created: boolean } | Failure {
  const s = store()
  const from = s.threads.find((t) => t.id === fromThreadId)
  if (!from || !canSeeThread(viewerId, from)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  const finding = s.messages.find((m): m is Finding => m.kind === 'agent_finding' && m.id === findingId && m.threadId === from.id)
  if (!finding) return { ok: false, status: 404, code: 'NO_FINDING', message: 'Finding not found.' }
  if (from.visibility !== 'private' || from.ownerId !== viewerId) return { ok: false, status: 403, code: 'NOT_YOUR_BRIEF', message: "Only a brief's owner can take its findings to a team thread." }
  const to = s.threads.find((t) => t.id === toThreadId)
  if (!to || !canSeeThread(viewerId, to)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  if (to.visibility !== 'internal') return { ok: false, status: 400, code: 'NOT_A_TEAM_THREAD', message: 'Findings go to a team thread; a client hears from you through a draft.' }
  if (!to.memberIds.includes(viewerId) || !can(viewerId, 'post_firm')) return { ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'Only members can post in that thread.' }
  const existing = s.messages.find((m): m is Carried => m.kind === 'carried' && m.threadId === to.id && m.findingId === finding.id)
  if (existing) return { ok: true, message: existing, created: false }
  const { agentId, at, claim, figures, citations, attention } = finding
  const message: Carried = {
    kind: 'carried', id: nextId('msg'), threadId: to.id, at: nextAt(), carriedBy: viewerId, fromThreadId: from.id, findingId: finding.id,
    finding: { agentId, at, claim, figures, citations, attention },
  }
  s.messages.push(message)
  return { ok: true, message, created: true }
}
