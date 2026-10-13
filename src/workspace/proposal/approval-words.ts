import type { ApprovalState } from '@/types/workspace-proposal'

export const isApprovedLatest = (state: ApprovalState) => state.kind === 'approved' && state.version === state.latestVersion

/** Approval belongs to one exact version; a newer version is said to be unapproved. Released orders close the proposal. */
export function approvalWords(state: ApprovalState): string {
  switch (state.kind) {
    case 'unapproved': return `v${state.latestVersion} is not approved`
    case 'released': return `v${state.version} was released by compliance and filled`
    case 'approved': return state.version === state.latestVersion ? `v${state.version} is approved` : `Approval applies to v${state.version}; v${state.latestVersion} is unapproved`
  }
}
