import type { Message, Thread } from '@/types/workspace'
import type { DraftPreview, LegEdit, Proposal, ProposalConstraint, ProposalDetail, ProposalVersion } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { can, personById } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { detailOf, filledMessage, latestVersion, nextProposalId, proposalsInThread, releasedApproval } from '@/mocks/data/proposals-store'
import { agentConstraints, draftSummary, proposalTitle, revisionSummary } from '@/mocks/agents/proposal-agent'
import { buildVersion, editSummary, normaliseEdits } from './proposal-engine'
import { visibleProposal } from './proposal-acts'
import { canSeeThread } from './visibility'

export type ProposalFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
const refuse = (status: ProposalFailure['status'], code: string, message: string): ProposalFailure => ({ ok: false, status, code, message })

const NOT_FOUND = refuse(404, 'NO_PROPOSAL', 'Proposal not found.')

/**
 * A firm team thread the viewer can see and post in, with the Proposal Agent on it. Proposals live
 * only in internal threads, where compliance supervises the staged orders and the act markers.
 */
function draftingThread(viewerId: string, threadId: string): { ok: true; thread: Thread } | ProposalFailure {
  // Proposals are a firm surface: a client sees no trace of them, even in their own thread.
  if (personById(viewerId)?.role === 'client') return refuse(404, 'NOT_FOUND', 'Not found.')
  const thread = store().threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread)) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (thread.visibility === 'client') return refuse(400, 'CLIENT_THREAD', 'Agents never post in a client thread.')
  if (thread.visibility !== 'internal') return refuse(400, 'NOT_A_TEAM_THREAD', 'Proposals are drafted in a firm team thread, where compliance can see them.')
  if (!thread.agentIds.includes('proposal')) return refuse(403, 'NOT_ON_THREAD', 'The Proposal Agent is not on this thread.')
  if (!thread.memberIds.includes(viewerId) || !can(viewerId, 'post_firm')) return refuse(403, 'NOT_A_MEMBER', 'Only members of the thread can work on its proposals.')
  return { ok: true, thread }
}

/** A proposal whose orders were filled is closed. */
function closedRefusal(proposal: Proposal): ProposalFailure | undefined {
  const released = releasedApproval(proposal.id)
  return released ? refuse(409, 'FILLED', filledMessage(released.version)) : undefined
}

function append(proposal: Proposal, version: Omit<ProposalVersion, 'n' | 'createdAt'>): ProposalDetail {
  const at = nextAt()
  const n = latestVersion(proposal).n + 1
  proposal.versions.push({ ...version, n, createdAt: at })
  const line: Message = { kind: 'proposal_version', id: nextId('msg'), threadId: proposal.threadId, at, proposalId: proposal.id, version: n, author: version.author, changeSummary: version.changeSummary }
  store().messages.push(line)
  return detailOf(proposal)
}

export function createProposal(viewerId: string, threadId: string, accountId: string): { ok: true; detail: ProposalDetail; created: boolean } | ProposalFailure {
  const guard = draftingThread(viewerId, threadId)
  if (!guard.ok) return guard
  const { thread } = guard
  if (thread.subject?.type !== 'account' || thread.subject.id !== accountId) return refuse(400, 'NOT_THE_SUBJECT', "A proposal here is for the thread's own account.")
  const forAccount = proposalsInThread(thread.id).filter((p) => p.accountId === accountId)
  const existing = forAccount.find((p) => releasedApproval(p.id) === undefined)
  if (existing) return { ok: true, detail: detailOf(existing), created: false }
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return refuse(404, 'NO_ACCOUNT', 'Account not found.')
  const constraints = agentConstraints([])
  const built = buildVersion(accountId, constraints, [])
  if (!built.ok) return refuse(400, built.code, built.message)
  const at = nextAt()
  const proposal: Proposal = {
    id: nextProposalId(), title: forAccount.length === 0 ? proposalTitle(accountId) : `${proposalTitle(accountId)} ${forAccount.length + 1}`, accountId, clientId: account.clientId, threadId: thread.id,
    versions: [{ n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: at, constraints, edits: [], changeSummary: draftSummary(accountId, built.built), ...built.built }],
  }
  const s = store()
  s.proposals.push(proposal)
  s.messages.push({ kind: 'proposal', id: nextId('msg'), threadId: thread.id, agentId: 'proposal', at, proposalId: proposal.id })
  return { ok: true, detail: detailOf(proposal), created: true }
}

/** The agent redrafts from its own legs under the new constraints; workbench edits on the latest version are not carried. */
export function reviseProposal(viewerId: string, proposalId: string, requested: readonly ProposalConstraint[]): { ok: true; detail: ProposalDetail } | ProposalFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const closed = closedRefusal(proposal)
  if (closed) return closed
  const guard = draftingThread(viewerId, proposal.threadId)
  if (!guard.ok) return guard
  const latest = latestVersion(proposal)
  const constraints = agentConstraints(requested)
  const built = buildVersion(proposal.accountId, constraints, [])
  if (!built.ok) return refuse(400, built.code, built.message)
  if (latest.edits.length === 0 && built.built.fingerprint === latest.fingerprint) {
    return refuse(409, 'NO_CHANGE', `v${latest.n} already has those constraints.`)
  }
  return {
    ok: true,
    detail: append(proposal, {
      author: { kind: 'agent', agentId: 'proposal' }, constraints, edits: [],
      changeSummary: revisionSummary(constraints, built.built, latest), ...built.built,
    }),
  }
}

/** A person version: the latest version's constraints, with these edits in place of its edits. */
export function saveVersion(viewerId: string, proposalId: string, edits: readonly LegEdit[]): { ok: true; detail: ProposalDetail } | ProposalFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const closed = closedRefusal(proposal)
  if (closed) return closed
  const guard = draftingThread(viewerId, proposal.threadId)
  if (!guard.ok) return guard
  const latest = latestVersion(proposal)
  const built = buildVersion(proposal.accountId, latest.constraints, edits)
  if (!built.ok) return refuse(400, built.code, built.message)
  if (built.built.fingerprint === latest.fingerprint) return refuse(409, 'NO_CHANGE', `Nothing differs from v${latest.n}.`)
  return {
    ok: true,
    detail: append(proposal, {
      author: { kind: 'person', personId: viewerId }, constraints: latest.constraints, edits: normaliseEdits(edits),
      changeSummary: editSummary(edits, built.names), ...built.built,
    }),
  }
}

/** What the edits would make of the latest version, saved nowhere. Any firm viewer who can see the proposal may look. */
export function previewEdits(viewerId: string, proposalId: string, edits: readonly LegEdit[]): { ok: true; preview: DraftPreview } | ProposalFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const closed = closedRefusal(proposal)
  if (closed) return closed
  const built = buildVersion(proposal.accountId, latestVersion(proposal).constraints, edits)
  return built.ok ? { ok: true, preview: built.built } : refuse(400, built.code, built.message)
}

/** Undefined means 404: a client viewer, or a thread the viewer cannot see or that holds no proposals by design. */
export function readableProposals(viewerId: string, threadId?: string): ProposalDetail[] | undefined {
  const viewer = personById(viewerId)
  if (!viewer || viewer.role === 'client') return undefined
  const s = store()
  if (threadId !== undefined) {
    const thread = s.threads.find((t) => t.id === threadId)
    if (!thread || thread.visibility === 'client' || !canSeeThread(viewerId, thread)) return undefined
    return proposalsInThread(thread.id).map(detailOf)
  }
  return s.proposals.filter((p) => visibleProposal(viewerId, p.id) !== undefined).map(detailOf)
}
