import type { AgentId, Message } from '@/types/workspace'
import { AGENT_DEFINITIONS } from '@/mocks/agents/registry'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { runKeyOf } from './run-key'

export const BRIEF_THREAD_ID = 'th-brief'

type Finding = Extract<Message, { kind: 'agent_finding' }>

let composed: readonly Message[] | undefined

/**
 * The Brief as it stands at the frozen morning: each of its agents' findings, computed at the
 * calculations' as-of, and a ranked summary ahead of them — findings that need attention first,
 * then in the order the Brief lists its agents. Deterministic, so it is composed once.
 */
export function briefMessages(): Message[] {
  composed ??= composeBrief()
  return composed.map((m) => ({ ...m }))
}

function composeBrief(): Message[] {
  const thread = SEED_THREADS.find((t) => t.id === BRIEF_THREAD_ID)
  const subject = thread?.subject
  if (!thread || !subject) throw new Error('The Brief thread needs a subject')
  const findings: Finding[] = thread.agentIds
    .flatMap((agentId) => {
      const agent = AGENT_DEFINITIONS.get(agentId)
      if (!agent) throw new Error(`The Brief lists ${agentId}, which reports no findings`)
      const runKey = runKeyOf(agentId, thread.id, subject)
      return agent.run({ asOf: MOCK_NOW_ISO, subject }).map((f) => ({ ...f, agentId, runKey }))
    })
    .map((f, i) => ({ kind: 'agent_finding', id: `msg-b${String(i + 1).padStart(2, '0')}`, threadId: thread.id, at: MOCK_NOW_ISO, ...f }))
  const order = (id: AgentId) => thread.agentIds.indexOf(id)
  const ranked = [...findings].sort((a, b) =>
    Number(b.attention === 'attention') - Number(a.attention === 'attention') || order(a.agentId) - order(b.agentId))
  const summary: Message = {
    kind: 'brief_summary', id: 'msg-b00', threadId: thread.id, at: MOCK_NOW_ISO,
    items: ranked.map((f) => ({ findingId: f.id, agentId: f.agentId, claim: f.claim, attention: f.attention })),
  }
  return [summary, ...findings]
}
