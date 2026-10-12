import type { AgentId } from '@/types/workspace'
import type { AgentDefinition } from './agent'
import { AGENTS } from '@/mocks/data/people'
import { runDriftMonitor } from './drift-monitor'
import { runPretradeCheck } from './pretrade-check'

/** Agents that report findings in a thread. The Proposal and Client Letter agents work through their own operations. */
const RUNNERS: ReadonlyMap<AgentId, AgentDefinition['run']> = new Map<AgentId, AgentDefinition['run']>([
  ['drift-monitor', runDriftMonitor],
  ['pretrade-check', runPretradeCheck],
])

export const AGENT_DEFINITIONS: ReadonlyMap<AgentId, AgentDefinition> = new Map(
  AGENTS.flatMap((a): [AgentId, AgentDefinition][] => {
    const run = RUNNERS.get(a.id)
    return run ? [[a.id, { ...a, run }]] : []
  }),
)
