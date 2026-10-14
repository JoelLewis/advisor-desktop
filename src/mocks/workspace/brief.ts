import type { AgentId, Message } from '@/types/workspace'
import type { AgentContext } from '@/mocks/agents/agent'
import { withoutTopic, type TopicFinding } from '@/mocks/agents/brief-topic'
import { runDriftMonitor } from '@/mocks/agents/drift-monitor'
import { runHarvestScanner } from '@/mocks/agents/harvest-scanner'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { runKeyOf } from './run-key'
import { briefItems } from './brief-groups'

export const BRIEF_THREAD_ID = 'th-brief'

let composed: readonly Message[] | undefined

const pad2 = (n: number) => String(n).padStart(2, '0')

/** The Brief's agents, run for their tagged findings: the Brief groups what the registry serves untagged. */
const BRIEF_RUNNERS: ReadonlyMap<AgentId, (context: AgentContext) => TopicFinding[]> = new Map<AgentId, (context: AgentContext) => TopicFinding[]>([
  ['drift-monitor', runDriftMonitor],
  ['harvest-scanner', runHarvestScanner],
])

/**
 * The Brief as it stands: each of its agents' findings on the book as it is now, and a summary in two
 * groups, Needs a decision and Context, ahead of them. `idOf(0)` names the summary, `idOf(n)` the nth
 * finding. `at` is when it is measured, so it is also every agent's as-of: a re-measure states the time
 * it read the moved book.
 */
export function composeBrief(idOf: (index: number) => string, at: string): Message[] {
  const thread = SEED_THREADS.find((t) => t.id === BRIEF_THREAD_ID)
  const subject = thread?.subject
  if (!thread || !subject) throw new Error('The Brief thread needs a subject')
  const measured = thread.agentIds.flatMap((agentId) => {
    const run = BRIEF_RUNNERS.get(agentId)
    if (!run) throw new Error(`The Brief lists ${agentId}, which does not tag its findings for the Brief`)
    const runKey = runKeyOf(agentId, thread.id, subject)
    return run({ asOf: at, subject }).map((finding) => ({ agentId, runKey, finding }))
  })
  const findings: Message[] = measured.map(({ agentId, runKey, finding }, i) => (
    { kind: 'agent_finding', id: idOf(i + 1), threadId: thread.id, at, agentId, runKey, ...withoutTopic(finding) }))
  const { decide, context } = briefItems(measured.map(({ agentId, finding }, i) => ({ ...finding, id: idOf(i + 1), agentId })), thread.agentIds)
  return [{ kind: 'brief_summary', id: idOf(0), threadId: thread.id, at, decide, context }, ...findings]
}

/** The morning's Brief, at the calculations' as-of. Deterministic for the fixtures' book, so it is composed once. */
export function briefMessages(): Message[] {
  const morning = () => composeBrief((i) => `msg-b${pad2(i)}`, MOCK_NOW_ISO)
  if (bookVersion() > 0) return morning()
  composed ??= morning()
  return composed.map((m) => ({ ...m }))
}
