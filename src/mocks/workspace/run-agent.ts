import type { AgentId, Message } from '@/types/workspace'
import { AGENT_DEFINITIONS } from '@/mocks/agents/registry'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { canSeeThread } from './visibility'

type Failure = { ok: false; status: 400 | 403 | 404; code: string; message: string }

export function runAgent(viewerId: string, threadId: string, agentId: AgentId): { ok: true; findings: Message[] } | Failure {
  const s = store()
  const thread = s.threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  if (thread.visibility === 'client') return { ok: false, status: 400, code: 'CLIENT_THREAD', message: 'Agents never post in a client thread.' }
  const agent = AGENT_DEFINITIONS.get(agentId)
  if (!agent || !thread.agentIds.includes(agentId)) return { ok: false, status: 403, code: 'NOT_ON_THREAD', message: 'That agent is not on this thread.' }
  const subject = thread.subject
  if (!subject) return { ok: false, status: 400, code: 'NO_SUBJECT', message: 'This thread has no subject for the agent to work on.' }
  const runKey = `${agentId}|${thread.id}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}`
  const existing = s.messages.filter((m): m is Extract<Message, { kind: 'agent_finding' }> => m.kind === 'agent_finding' && m.runKey === runKey)
  if (existing.length > 0) return { ok: true, findings: existing }
  const findings: Message[] = agent.run({ asOf: MOCK_NOW_ISO, subject }).map((f) => ({
    kind: 'agent_finding', id: nextId('msg'), threadId: thread.id, agentId, at: nextAt(), runKey, ...f,
  }))
  s.messages.push(...findings)
  return { ok: true, findings }
}
