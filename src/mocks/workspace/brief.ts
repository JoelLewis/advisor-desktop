import type { AgentId, Message } from '@/types/workspace'
import { AGENT_DEFINITIONS } from '@/mocks/agents/registry'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { runKeyOf } from './run-key'

export const BRIEF_THREAD_ID = 'th-brief'

type Finding = Extract<Message, { kind: 'agent_finding' }>

let composed: readonly Message[] | undefined

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * The Brief as it stands: each of its agents' findings on the book as it is now, and a ranked
 * summary ahead of them — findings that need attention first, then in the order the Brief lists
 * its agents. `idOf(0)` names the summary, `idOf(n)` the nth finding. `at` is when it is measured,
 * so it is also every agent's as-of: a re-measure states the time it read the moved book.
 */
export function composeBrief(idOf: (index: number) => string, at: string): Message[] {
  const thread = SEED_THREADS.find((t) => t.id === BRIEF_THREAD_ID)
  const subject = thread?.subject
  if (!thread || !subject) throw new Error('The Brief thread needs a subject')
  const findings: Finding[] = thread.agentIds
    .flatMap((agentId) => {
      const agent = AGENT_DEFINITIONS.get(agentId)
      if (!agent) throw new Error(`The Brief lists ${agentId}, which reports no findings`)
      const runKey = runKeyOf(agentId, thread.id, subject)
      return agent.run({ asOf: at, subject }).map((f) => ({ ...f, agentId, runKey }))
    })
    .map((f, i) => ({ kind: 'agent_finding', id: idOf(i + 1), threadId: thread.id, at, ...f }))
  const order = (id: AgentId) => thread.agentIds.indexOf(id)
  const ranked = [...findings].sort((a, b) =>
    Number(b.attention === 'attention') - Number(a.attention === 'attention') || order(a.agentId) - order(b.agentId))
  const summary: Message = {
    kind: 'brief_summary', id: idOf(0), threadId: thread.id, at,
    items: ranked.map((f) => ({ findingId: f.id, agentId: f.agentId, claim: f.claim, attention: f.attention })),
  }
  return [summary, ...findings]
}

/** The morning's Brief, at the calculations' as-of. Deterministic for the fixtures' book, so it is composed once. */
export function briefMessages(): Message[] {
  const morning = () => composeBrief((i) => `msg-b${pad2(i)}`, MOCK_NOW_ISO)
  if (bookVersion() > 0) return morning()
  composed ??= morning()
  return composed.map((m) => ({ ...m }))
}
