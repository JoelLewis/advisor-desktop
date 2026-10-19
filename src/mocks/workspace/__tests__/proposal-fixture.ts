import type { LegEdit, Proposal, ProposalConstraint, ProposalVersion } from '@/types/workspace-proposal'
import { nextAt, store } from '@/mocks/data/workspace-store'
import { nextProposalId } from '@/mocks/data/proposals-store'
import { buildVersion } from '../proposal-engine'

export const AGENT_CONSTRAINTS: ProposalConstraint[] = [{ kind: 'avoid_self_wash' }]

/** `proposalId` is the proposal the version joins: its own pending orders are its legs, not working orders to count. */
export function versionOf(n: number, constraints: ProposalConstraint[], edits: LegEdit[] = [], proposalId?: string): ProposalVersion {
  const r = buildVersion('acc-002', constraints, edits, proposalId)
  if (!r.ok) throw new Error(r.message)
  return { n, author: { kind: 'agent', agentId: 'proposal' }, createdAt: nextAt(), constraints, edits, changeSummary: 'Drafted a tax-aware rebalance.', ...r.built }
}

/** A Johnson proposal with v1 by the agent, placed straight in the store (Task 7 adds the real operation). */
export function seedJohnsonProposal(): Proposal {
  const proposal: Proposal = {
    id: nextProposalId(), title: 'Johnson rebalance', accountId: 'acc-002', clientId: 'cli-001', threadId: 'th-johnson-review',
    versions: [versionOf(1, AGENT_CONSTRAINTS)],
  }
  store().proposals.push(proposal)
  return proposal
}
