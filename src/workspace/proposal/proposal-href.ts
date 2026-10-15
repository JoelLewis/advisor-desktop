/** The workbench for a proposal, remembering the thread it was opened from. */
export const proposalWorkbenchHref = (proposalId: string, fromThreadId?: string) =>
  `/proposals/${encodeURIComponent(proposalId)}${fromThreadId ? `?from=${encodeURIComponent(fromThreadId)}` : ''}`
