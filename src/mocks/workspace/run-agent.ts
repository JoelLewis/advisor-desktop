import type { AgentId, Message } from '@/types/workspace'
import { AGENT_DEFINITIONS } from '@/mocks/agents/registry'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { canSeeThread } from './visibility'
import { runKeyOf } from './run-key'
import { prospectRevision } from './prospects'

type Failure = { ok: false; status: 400 | 403 | 404; code: string; message: string }

type Finding = Extract<Message, { kind: 'agent_finding' }>
type Resolved = { ok: true; threadId: string; runKey: string; run: () => ReturnType<NonNullable<ReturnType<typeof AGENT_DEFINITIONS.get>>['run']> } | Failure

/** The pure part shared by run and preview: resolve, authorize and validate, touching no store state. */
function resolveRun(viewerId: string, threadId: string, agentId: AgentId): Resolved {
  const thread = store().threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  if (thread.visibility === 'client') return { ok: false, status: 400, code: 'CLIENT_THREAD', message: 'Agents never post in a client thread.' }
  const agent = AGENT_DEFINITIONS.get(agentId)
  if (!agent && thread.agentIds.includes(agentId)) {
    return { ok: false, status: 400, code: 'NO_FINDINGS', message: 'This agent does not report findings; ask it through its own controls.' }
  }
  if (!agent || !thread.agentIds.includes(agentId)) return { ok: false, status: 403, code: 'NOT_ON_THREAD', message: 'That agent is not on this thread.' }
  const subject = thread.subject
  if (!subject) return { ok: false, status: 400, code: 'NO_SUBJECT', message: 'This thread has no subject for the agent to work on.' }
  const runKey = runKeyOf(agentId, thread.id, subject, subject.type === 'prospect' ? prospectRevision(subject.id) : undefined)
  return { ok: true, threadId: thread.id, runKey, run: () => agent.run({ asOf: MOCK_NOW_ISO, subject }) }
}

/** Read-only: what a run would find, shaped as findings with deterministic ids. Writes nothing to the store. */
export function previewAgent(viewerId: string, threadId: string, agentId: AgentId): { ok: true; findings: Message[] } | Failure {
  const resolved = resolveRun(viewerId, threadId, agentId)
  if (!resolved.ok) return resolved
  const findings: Finding[] = resolved.run().map((f, n) => ({
    kind: 'agent_finding', id: `preview-${agentId}-${n}`, threadId: resolved.threadId, agentId, at: MOCK_NOW_ISO, runKey: resolved.runKey, ...f,
  }))
  return { ok: true, findings }
}

export function runAgent(viewerId: string, threadId: string, agentId: AgentId): { ok: true; findings: Message[] } | Failure {
  const resolved = resolveRun(viewerId, threadId, agentId)
  if (!resolved.ok) return resolved
  const s = store()
  const existing = s.messages.filter((m): m is Finding => m.kind === 'agent_finding' && m.runKey === resolved.runKey)
  if (existing.length > 0) return { ok: true, findings: existing }
  const findings: Message[] = resolved.run().map((f) => ({
    kind: 'agent_finding', id: nextId('msg'), threadId: resolved.threadId, agentId, at: nextAt(), runKey: resolved.runKey, ...f,
  }))
  s.messages.push(...findings)
  return { ok: true, findings }
}
