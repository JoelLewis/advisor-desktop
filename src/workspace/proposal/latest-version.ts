import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'

/**
 * The version a proposal shows. Components call this before any early return, so a hook never
 * follows a conditional throw; a proposal without versions is an engine error, reported, never a blank.
 */
export function latestVersionOf(proposal: Pick<Proposal, 'id' | 'versions'>): ProposalVersion {
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${proposal.id} has no versions`)
  return latest
}
