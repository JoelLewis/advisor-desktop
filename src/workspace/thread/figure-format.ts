import type { Status } from '@/kit/status/status'
import type { AgentId, Attention } from '@/types/workspace'

/** A finding's status code, or 'none' for an informational finding that carries no code. */
export type FindingStatus = Extract<Status, 'BLOCK' | 'WARN' | 'OUT'> | 'none'

type StatusFacts = { agentId: AgentId; claim: string; attention: Attention }

/**
 * Whether a finding marks a breach. OUT means outside a limit, as on the drift gauges; a harvest
 * opportunity needs a decision but breaches nothing, and a meeting's attention items need discussion,
 * so neither carries a code.
 */
export const marksBreach = ({ agentId, attention }: Pick<StatusFacts, 'agentId' | 'attention'>): boolean =>
  attention === 'attention' && agentId !== 'harvest-scanner' && agentId !== 'meeting-prep'

/** A pre-trade verdict when the claim states one; otherwise OUT for a breach, and no code for an opportunity or information. */
export function findingStatus(finding: StatusFacts): FindingStatus {
  if (finding.claim.startsWith('Blocked')) return 'BLOCK'
  if (finding.claim.startsWith('Warning')) return 'WARN'
  return marksBreach(finding) ? 'OUT' : 'none'
}
