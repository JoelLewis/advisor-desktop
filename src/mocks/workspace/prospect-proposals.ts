import type { AssetClass } from '@/types/portfolio'
import type {
  FeeEstimate, ProspectConstraint, ProspectProposal, ProspectProposalDetail, ProspectProposalVersion, ProspectRecord, Sleeve, Tranche, TransferLine, TransferSummary,
} from '@/types/workspace-prospect'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { FIRM_FEE_SCHEDULE, feeOn } from '@/mocks/data/fee-schedule'
import {
  clientSummaryOf, prospectChangeSummary, prospectDraftSummary, prospectProposalTitle, type ProspectVersionContent,
} from '@/mocks/agents/prospect-proposal-agent'
import { fingerprint } from '@/lib/fingerprint'
import { TAX_ESTIMATE_NOTE, taxRateFor } from '@/lib/tax-rules'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { bestInterestDraftOf } from './best-interest'
import { modelWeights } from './prospect-model'
import { requireProspect, visibleProspect } from './prospects'
import { profileOf } from './risk-scoring'
import { cents, concentrationOf, transferSummary } from './transfer-in'
import { canSeeThread } from './visibility'

export type ProspectProposalFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type BuiltProspectVersion = ProspectVersionContent & { clientSummary: string; fingerprint: string }
const refuse = (status: ProspectProposalFailure['status'], code: string, message: string): ProspectProposalFailure => ({ ok: false, status, code, message })
const NO_PROPOSAL = refuse(404, 'NO_PROPOSAL', 'Proposal not found.')

export const prospectProposalById = (id: string): ProspectProposal | undefined => store().prospectProposals.find((p) => p.id === id)

export function latestProspectVersion(proposal: ProspectProposal): ProspectProposalVersion {
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Prospect proposal ${proposal.id} has no versions`)
  return latest
}

export function visibleProspectProposal(viewerId: string, proposalId: string): ProspectProposal | undefined {
  const proposal = prospectProposalById(proposalId)
  return proposal && visibleProspect(viewerId, proposal.prospectId) ? proposal : undefined
}

export function prospectProposalDetail(proposal: ProspectProposal): ProspectProposalDetail {
  const record = requireProspect(proposal.prospectId)
  return {
    ...proposal,
    ...(record.sent?.proposalId === proposal.id ? { sent: record.sent } : {}),
    ...(record.accepted?.proposalId === proposal.id ? { accepted: record.accepted } : {}),
    bestInterestDraft: bestInterestDraftOf(latestProspectVersion(proposal)),
  }
}

function feesOn(base: number): FeeEstimate {
  const { fee, blendedRate } = feeOn(base)
  return { scheduleName: FIRM_FEE_SCHEDULE.name, base, annual: cents(fee), blendedRate, tiers: FIRM_FEE_SCHEDULE.published.map((t) => ({ label: t.label, rate: t.rate })) }
}

function sleevesOf(modelId: string, summary: TransferSummary): Sleeve[] {
  const target = modelWeights(modelId)
  const held = new Map<AssetClass, number>()
  for (const l of summary.lines) held.set(l.assetClass, (held.get(l.assetClass) ?? 0) + l.marketValue)
  held.set('cash', (held.get('cash') ?? 0) + summary.cash)
  return [...new Set([...target.keys(), ...held.keys()])].map((assetClass) => ({
    assetClass, target: target.get(assetClass) ?? 0, transferred: (held.get(assetClass) ?? 0) / summary.transferValue,
  }))
}

/** The concentrated holding sold in equal annual parts (the last takes any remainder), each with its basis share, gain and tax estimate. Nothing is sold. */
function tranchesOf(tranches: 2 | 3, line: TransferLine): Tranche[] {
  const year = Number(MOCK_TODAY_ISO.slice(0, 4))
  const each = Math.floor(line.quantity / tranches)
  const eachBasis = cents((line.costBasis * each) / line.quantity)
  return Array.from({ length: tranches }, (_, i) => {
    const last = i === tranches - 1
    const shares = last ? line.quantity - each * (tranches - 1) : each
    const basis = last ? cents(line.costBasis - eachBasis * (tranches - 1)) : eachBasis
    const proceeds = cents(shares * line.price)
    const gain = cents(proceeds - basis)
    return { n: i + 1, taxYear: year + i, shares, proceeds, gain, tax: gain > 0 ? cents(gain * taxRateFor(line.holdingPeriod)) : 0 }
  })
}

export function buildProspectVersion(record: ProspectRecord, constraints: readonly ProspectConstraint[]): { ok: true; built: BuiltProspectVersion } | ProspectProposalFailure {
  const profile = profileOf(record)
  if (!profile) return refuse(409, 'NO_QUESTIONNAIRE', 'Her questionnaire is not on file yet.')
  const summary = transferSummary(record)
  if (!summary) return refuse(409, 'NO_STATEMENTS', 'Her statements are not on file yet.')
  const concentration = concentrationOf(summary)
  const staged = constraints.find((c) => c.kind === 'stage_diversification')
  const line = concentration && summary.lines.find((l) => l.symbol === concentration.symbol)
  if (staged && !line) return refuse(400, 'NOTHING_TO_STAGE', 'She holds no concentrated position to stage.')
  const content: ProspectVersionContent = {
    constraints: [...constraints], score: profile.score, profileLabel: profile.profileLabel, modelId: profile.modelId, modelName: profile.modelName,
    transfer: summary.lines, cash: summary.cash, transferValue: summary.transferValue, totalAssets: summary.totalAssets,
    sleeves: sleevesOf(profile.modelId, summary), ...(concentration ? { concentration } : {}),
    tranches: staged && line ? tranchesOf(staged.tranches, line) : [], heldAway: summary.heldAway, fees: feesOn(summary.transferValue), pricesAsOf: summary.pricesAsOf,
    taxNote: TAX_ESTIMATE_NOTE,
  }
  const clientSummary = clientSummaryOf(record, content)
  const identity = [content.modelId, content.transfer.map((l) => [l.symbol, l.quantity, l.price, l.costBasis]), content.cash, content.tranches, content.fees.annual, clientSummary]
  return { ok: true, built: { ...content, clientSummary, fingerprint: fingerprint(JSON.stringify(identity)) } }
}

/** The internal thread where her proposal is drafted: the Proposal Agent on it, the viewer a member who may post. */
function draftingRefusal(viewerId: string, record: ProspectRecord): ProspectProposalFailure | undefined {
  const thread = store().threads.find((t) => t.id === record.internalThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (!thread.agentIds.includes('proposal')) return refuse(403, 'NOT_ON_THREAD', 'The Proposal Agent is not on this thread.')
  if (!thread.memberIds.includes(viewerId) || !can(viewerId, 'post_firm')) return refuse(403, 'NOT_A_MEMBER', 'Only members of the thread can work on its proposal.')
  return undefined
}

function sentRefusal(proposal: ProspectProposal): ProspectProposalFailure | undefined {
  const sent = requireProspect(proposal.prospectId).sent
  return sent?.proposalId === proposal.id ? refuse(409, 'ALREADY_SENT', `v${sent.version} was sent to her (${sent.actId}); this proposal is closed.`) : undefined
}

export function createProspectProposal(viewerId: string, prospectId: string): { ok: true; detail: ProspectProposalDetail; created: boolean } | ProspectProposalFailure {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return refuse(404, 'NO_PROSPECT', 'Prospect not found.')
  const refused = draftingRefusal(viewerId, record)
  if (refused) return refused
  const existing = store().prospectProposals.find((p) => p.prospectId === record.id)
  if (existing) return { ok: true, detail: prospectProposalDetail(existing), created: false }
  const built = buildProspectVersion(record, [])
  if (!built.ok) return built
  const at = nextAt()
  const proposal: ProspectProposal = {
    id: `pprop-${pad(nextNumber('pproposal'))}`, prospectId: record.id, title: prospectProposalTitle(record), threadId: record.internalThreadId,
    versions: [{ n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: at, changeSummary: prospectDraftSummary(built.built), ...built.built }],
  }
  const s = store()
  s.prospectProposals.push(proposal)
  s.messages.push({ kind: 'prospect_proposal', id: nextId('msg'), threadId: record.internalThreadId, at, agentId: 'proposal', proposalId: proposal.id, title: proposal.title })
  return { ok: true, detail: prospectProposalDetail(proposal), created: true }
}

export function reviseProspectProposal(viewerId: string, proposalId: string, constraints: readonly ProspectConstraint[]): { ok: true; detail: ProspectProposalDetail } | ProspectProposalFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  const closed = sentRefusal(proposal)
  if (closed) return closed
  const record = requireProspect(proposal.prospectId)
  const refused = draftingRefusal(viewerId, record)
  if (refused) return refused
  const built = buildProspectVersion(record, constraints)
  if (!built.ok) return built
  const latest = latestProspectVersion(proposal)
  if (built.built.fingerprint === latest.fingerprint) return refuse(409, 'NO_CHANGE', `v${latest.n} already says that.`)
  const at = nextAt()
  const n = latest.n + 1
  const changeSummary = prospectChangeSummary(constraints, built.built)
  proposal.versions.push({ n, author: { kind: 'agent', agentId: 'proposal' }, createdAt: at, changeSummary, ...built.built })
  store().messages.push({ kind: 'prospect_proposal_version', id: nextId('msg'), threadId: proposal.threadId, at, proposalId: proposal.id, version: n, author: { kind: 'agent', agentId: 'proposal' }, changeSummary })
  return { ok: true, detail: prospectProposalDetail(proposal) }
}

/** What a revision would make, saved nowhere. Any firm viewer who can see the proposal may look. */
export function previewProspectRevision(viewerId: string, proposalId: string, constraints: readonly ProspectConstraint[]): { ok: true; preview: BuiltProspectVersion } | ProspectProposalFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  const built = buildProspectVersion(requireProspect(proposal.prospectId), constraints)
  return built.ok ? { ok: true, preview: built.built } : built
}

export function readableProspectProposals(viewerId: string, prospectId: string): ProspectProposalDetail[] | undefined {
  const record = visibleProspect(viewerId, prospectId)
  return record ? store().prospectProposals.filter((p) => p.prospectId === record.id).map(prospectProposalDetail) : undefined
}

export function parseProspectConstraints(value: unknown): { ok: true; value: ProspectConstraint[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'constraints must be a list.' }
  const parsed: ProspectConstraint[] = []
  for (const raw of value) {
    const tranches: unknown = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).tranches : undefined
    const kind: unknown = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).kind : undefined
    if (kind !== 'stage_diversification' || (tranches !== 2 && tranches !== 3)) return { ok: false, message: 'A revision may stage the concentrated sale in two or three tax years.' }
    parsed.push({ kind: 'stage_diversification', tranches })
  }
  if (parsed.length > 1) return { ok: false, message: 'Stage the sale once.' }
  return { ok: true, value: parsed }
}
