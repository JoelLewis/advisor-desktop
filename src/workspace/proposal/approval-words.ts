import type { ApprovalState } from '@/types/workspace-proposal'

export const isApprovedLatest = (state: ApprovalState) => state.kind === 'approved' && state.version === state.latestVersion

/** Approval belongs to one exact version; a newer version is said to be unapproved. */
export function approvalWords(state: ApprovalState): string {
  if (state.kind === 'unapproved') return `v${state.latestVersion} is not approved`
  return isApprovedLatest(state) ? `v${state.version} is approved` : `Approval applies to v${state.version}; v${state.latestVersion} is unapproved`
}
