import type { BindingAct, Message } from '@/types/workspace'
import type { ProspectProposal } from '@/types/workspace-prospect'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { tradingDaysAfter } from '@/lib/trading-calendar'
import { ROLLOVER_LINE, bestInterestDraftOf } from './best-interest'
import { deliveryOf, recordDelivery } from './disclosures'
import { recordAct } from './proposal-acts'
import { advanceStage, requireProspect } from './prospects'
import { latestProspectVersion, visibleProspectProposal } from './prospect-proposals'

export type ProspectActFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
type Recorded = { ok: true; act: BindingAct }
const refuse = (status: ProspectActFailure['status'], code: string, message: string): ProspectActFailure => ({ ok: false, status, code, message })
const NO_PROPOSAL = refuse(404, 'NO_PROPOSAL', 'Proposal not found.')

export const RATIONALE_MAX = 2000
const ROLLOVER_FOLLOW_UP_DAYS = 5

function sentRefusal(proposal: ProspectProposal): ProspectActFailure | undefined {
  const sent = requireProspect(proposal.prospectId).sent
  return sent?.proposalId === proposal.id ? refuse(409, 'ALREADY_SENT', `v${sent.version} was already sent to her (${sent.actId}).`) : undefined
}

export function approveProspectProposal(viewerId: string, proposalId: string, version: number, contentFingerprint: string, rationale: string): Recorded | ProspectActFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  if (!can(viewerId, 'approve_proposal')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor of record can approve a proposal.')
  const sent = sentRefusal(proposal)
  if (sent) return sent
  const v = proposal.versions.find((x) => x.n === version)
  if (!v) return refuse(404, 'NO_VERSION', `There is no v${version} of this proposal.`)
  const latest = latestProspectVersion(proposal)
  // Only the latest version can be sent, so only the latest is approved: a newer version means the reviewed one is no longer the proposal.
  if (version !== latest.n) return refuse(409, 'NOT_LATEST', `v${latest.n} is newer than v${version}; review v${latest.n} before approving.`)
  if (v.fingerprint !== contentFingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', `v${version} is not the content you reviewed. Open it again before approving.`)
  const words = rationale.trim()
  if (words.length === 0 || words.length > RATIONALE_MAX) return refuse(400, 'BAD_RATIONALE', `Say why, in your own words, in 1 to ${RATIONALE_MAX} characters.`)
  const previous = proposal.approval
  if (previous?.version === version) return refuse(409, 'ALREADY_APPROVED', `v${version} is already approved (${previous.actId}).`)

  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'approve_proposal', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'prospect_proposal', id: proposal.id }, version, fingerprint: v.fingerprint,
    bestInterest: { ...bestInterestDraftOf(v), rationale: words },
    summary: previous
      ? `Approved v${version} of the ${proposal.title}, with the best-interest record; the approval of v${previous.version} is withdrawn`
      : `Approved v${version} of the ${proposal.title}, with the best-interest record`,
  }
  proposal.approval = { version, fingerprint: v.fingerprint, actId: act.id, approverId: viewerId, at }
  const record = requireProspect(proposal.prospectId)
  if (record.tasks.length === 0) {
    record.tasks.push({
      id: `ptask-${pad(nextNumber('ptask'))}`, text: `${ROLLOVER_LINE} Prepare the comparison.`, ownerId: viewerId,
      due: tradingDaysAfter(at.slice(0, 10), ROLLOVER_FOLLOW_UP_DAYS), createdAt: at, fromActId: act.id,
    })
  }
  recordAct(act)
  return { ok: true, act }
}

export function sendProspectProposal(viewerId: string, proposalId: string): Recorded | ProspectActFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  if (!can(viewerId, 'send_to_party')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor of record can send to a client or prospect.')
  const sent = sentRefusal(proposal)
  if (sent) return sent
  const record = requireProspect(proposal.prospectId)
  if (!deliveryOf(record, 'form_crs')) return refuse(409, 'FORM_CRS_REQUIRED', 'Firm policy: deliver Form CRS first; it comes before or with the first recommendation.')
  const approval = proposal.approval
  if (!approval) return refuse(409, 'NOT_APPROVED', 'Approve a version before sending it.')
  const latest = latestProspectVersion(proposal)
  if (latest.n !== approval.version) return refuse(409, 'NEWER_VERSION', `v${latest.n} is newer than the approved v${approval.version}; approve the version you mean to send.`)
  const v = proposal.versions.find((x) => x.n === approval.version)
  if (!v) throw new Error(`Approval ${approval.actId} names a missing version`)

  const withAdv2a = !deliveryOf(record, 'adv_2a')
  const at = nextAt()
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: record.threadId, authorId: viewerId, at, body: v.clientSummary }
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_party', actorId: viewerId, at, threadId: record.threadId,
    subject: { type: 'prospect_proposal', id: proposal.id }, version: v.n, fingerprint: fingerprint(v.clientSummary), messageId: text.id,
    basis: { proposalId: proposal.id, version: v.n, fingerprint: v.fingerprint },
    ...(withAdv2a ? { delivers: ['adv_2a' as const] } : {}),
    summary: `Sent v${v.n} of the ${proposal.title} to ${record.name}${withAdv2a ? `, with ${DISCLOSURE_TITLES.adv_2a}` : ''}`,
  }
  // ADV 2A at or before the proposal: its line is posted first, at the act's own time.
  if (withAdv2a) recordDelivery(record, 'adv_2a', act.id, viewerId, at)
  store().messages.push(text)
  recordAct(act)
  record.sent = { proposalId: proposal.id, version: v.n, actId: act.id, messageId: text.id, at }
  advanceStage(record, 'proposal', at)
  return { ok: true, act }
}
