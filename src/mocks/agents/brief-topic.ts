import type { AgentFinding } from './agent'
import type { HouseholdStatus } from '@/types/reference-risk'

/**
 * What a finding is about, as the Brief groups it. Only the Brief's two agents tag their findings, and
 * the tag stays in the engine: `withoutTopic` is applied before any finding is stored or served.
 */
export type BriefTopic =
  | { kind: 'out_of_band'; assetClass: string }
  | { kind: 'in_band' }
  | { kind: 'off_model' }
  | { kind: 'illiquid'; assetClass: string }
  | { kind: 'replacement_hold'; held: string; sold: string }
  | { kind: 'harvest_allowed'; symbol: string; name: string; remaining: boolean }
  | { kind: 'realized_loss'; symbol: string; name: string; when: 'today' | 'recently' }
  | { kind: 'held_away' }
  /** The account's model sits above the client's tolerance; `model` is digit-free, and `household` is where the client's household sits against the same band. */
  | { kind: 'model_above_tolerance'; accountId: string; model: string; clientName: string; tolerance: string; household: HouseholdStatus }
  /** Nothing to measure here: a custom mandate, no holdings, an untaxed account, or no loss to harvest. */
  | { kind: 'not_measured' }

export type TopicFinding = AgentFinding & { topic: BriefTopic }

export const withoutTopic = ({ claim, figures, citations, attention }: TopicFinding): AgentFinding => ({ claim, figures, citations, attention })
