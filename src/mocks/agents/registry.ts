import type { AgentId } from '@/types/workspace'
import type { AgentDefinition } from './agent'
import { AGENTS } from '@/mocks/data/people'
import { runDriftMonitor } from './drift-monitor'
import { runPretradeCheck } from './pretrade-check'

const RUNNERS: Record<AgentId, AgentDefinition['run']> = { 'drift-monitor': runDriftMonitor, 'pretrade-check': runPretradeCheck }

export const AGENT_DEFINITIONS: ReadonlyMap<AgentId, AgentDefinition> = new Map(
  AGENTS.map((a) => [a.id, { ...a, run: RUNNERS[a.id] }]),
)
