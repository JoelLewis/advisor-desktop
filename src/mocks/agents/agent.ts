import type { AgentProfile, Attention, Citation, Figure, Subject } from '@/types/workspace'

export type AgentContext = { asOf: string; subject: Subject }
export type AgentFinding = { claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type AgentDefinition = AgentProfile & { run: (context: AgentContext) => AgentFinding[] }
