import type { Draft, Thread } from '@/types/workspace'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { activeApproval, isDraftStale } from '@/mocks/data/proposals-store'
import { writeClientLetter } from '@/mocks/agents/client-letter'
import { visibleProposal } from './proposal-acts'
import { isStale, staleMessage } from './draft-staleness'
import { canSeeThread, isFirmViewer } from './visibility'

export type LetterFailure = { ok: false; status: 400 | 404 | 409; code: string; message: string }
const NO_THREAD: LetterFailure = { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }

/** A client thread the viewer may draft in; anyone else is told it does not exist. */
export function draftingClientThread(viewerId: string, threadId: string): Thread | undefined {
  const thread = store().threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread) || !isFirmViewer(viewerId) || !can(viewerId, 'draft_for_client')) return undefined
  return thread
}

export function draftLetter(viewerId: string, clientThreadId: string, proposalId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return NO_THREAD
  if (thread.visibility !== 'client') return { ok: false, status: 400, code: 'NOT_CLIENT_THREAD', message: 'Letters are drafted in a client thread.' }
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return { ok: false, status: 404, code: 'NO_PROPOSAL', message: 'Proposal not found.' }
  if (proposal.clientId !== thread.partyId) return { ok: false, status: 400, code: 'NOT_THIS_CLIENT', message: "That proposal is not for this thread's client." }
  const active = activeApproval(proposal.id)
  if (!active) return { ok: false, status: 409, code: 'NO_APPROVED_VERSION', message: 'Approve a version before asking for the client letter.' }
  const version = proposal.versions.find((v) => v.n === active.version)
  if (!version) throw new Error(`Approval ${active.actId} names a missing version`)
  const basis = { proposalId: proposal.id, version: version.n, fingerprint: version.fingerprint }
  const s = store()
  const existing = s.drafts.find((d) => d.clientThreadId === thread.id && d.agentId === 'client-letter' && !isDraftStale(d)
    && d.basis?.proposalId === basis.proposalId && d.basis.version === basis.version)
  if (existing) return { ok: true, draft: existing, created: false }
  const letter = writeClientLetter(proposal, version, active.approverId)
  const draft: Draft = { id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body: letter.body, createdAt: nextAt(), agentId: 'client-letter', basis, figures: letter.figures }
  s.drafts.push(draft)
  return { ok: true, draft, created: true }
}

export function reviseDraft(viewerId: string, clientThreadId: string, draftId: string, body: string): { ok: true; draft: Draft } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return NO_THREAD
  const s = store()
  const old = s.drafts.find((d) => d.id === draftId && d.clientThreadId === thread.id)
  if (!old) return { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (body.trim().length === 0) return { ok: false, status: 400, code: 'BAD_REQUEST', message: 'A non-empty body is required.' }
  // The edit keeps the letter's basis (so it still goes stale with the approval or the filing) but not its figures: the text is now the editor's.
  const draft: Draft = { id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body, createdAt: nextAt(), agentId: old.agentId, basis: old.basis,
    ...(old.recordBasis ? { recordBasis: old.recordBasis } : {}), supersedes: old.id,
    ...(old.copies ? { copies: old.copies } : {}),
    editorIds: [...new Set([...(old.editorIds ?? []), viewerId])] }
  s.drafts = s.drafts.map((d) => (d.id === old.id ? draft : d))
  return { ok: true, draft }
}

/** A client thread's drafts as a firm viewer sees them: each marked stale when its basis is no longer the approval or the filed record. */
export function draftsFor(clientThreadId: string): Draft[] {
  return store().drafts.filter((d) => d.clientThreadId === clientThreadId).map((d) => {
    const stale = isStale(d)
    return stale ? { ...d, stale, staleReason: staleMessage(d) } : { ...d, stale }
  })
}
