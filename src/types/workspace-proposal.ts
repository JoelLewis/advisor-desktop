import type { AssetClass } from './portfolio'
import type { CurrencyCode } from './currency'
import type { VersionAuthor } from './workspace'
import type { PreTradeCheckProposalResult, ProposedTrade, RebalancePreview } from '@/services/oms'

/** A rule the Proposal Agent must honour when it drafts or revises the legs. */
export type ProposalConstraint =
  | { kind: 'harvest_only' }
  /** Upper bound on the proposal's realised gains, gain legs only and losses not netted, in the account's currency. */
  | { kind: 'cap_realised_gains'; usd: number }
  | { kind: 'exclude_asset_class'; assetClass: AssetClass }
  | { kind: 'avoid_self_wash' }

/** A workbench change applied on top of the agent's legs; the engine re-validates it. */
export type LegEdit =
  | { kind: 'exclude'; symbol: string }
  | { kind: 'quantity'; symbol: string; quantity: number }
  | { kind: 'lots'; symbol: string; lotIds: string[] }

/**
 * What a sale takes from one lot: the shares, and the result they realise (signed, whole dollars)
 * by holding period. A leg's takes sum to its quantity and, by character, to its realised results.
 */
export type LotTake = { lotId: string; shares: number; realised: number; character: 'short' | 'long' }

/**
 * What each sell leg disposes of: its lots in sale order, what it takes from each (empty for a
 * tax-advantaged account, which realises nothing), and the part of its loss §1091 washes (≤ 0).
 */
export type LegFacts = { symbol: string; lotIds: string[]; lots: LotTake[]; washed: number }

/** A leg the workbench or a constraint removed, kept so the version still shows what was dropped. */
export type ExcludedLeg = Pick<ProposedTrade, 'symbol' | 'name' | 'side' | 'quantity' | 'estimatedValue'>

/** The tax and cash totals of a version's legs, all computed by the engine. */
export type ProposalTaxSummary = { sold: number; bought: number; gains: number; losses: number; netShortTerm: number; netLongTerm: number; washed: number; grossTax: number; netTax: number }

/** One immutable revision of a proposal; approval attaches to its fingerprint. */
export type ProposalVersion = {
  n: number
  author: VersionAuthor
  createdAt: string
  constraints: ProposalConstraint[]
  edits: LegEdit[]
  preview: RebalancePreview
  pretrade: PreTradeCheckProposalResult
  legFacts: LegFacts[]
  excludedLegs: ExcludedLeg[]
  summary: ProposalTaxSummary
  fingerprint: string
  changeSummary: string
}

/** A version-shaped result that has not been saved, for previewing workbench edits. */
export type DraftPreview = Pick<ProposalVersion, 'preview' | 'pretrade' | 'legFacts' | 'excludedLegs' | 'summary' | 'fingerprint'>

/** A proposal for one account, with every version it has had. */
export type Proposal = { id: string; title: string; accountId: string; clientId: string; threadId: string; versions: ProposalVersion[] }

/** The approval of one exact version, pinned to its fingerprint and the binding act that recorded it. */
export type ApprovalRecord = { proposalId: string; version: number; fingerprint: string; actId: string; approverId: string; at: string; status: 'active' | 'withdrawn' | 'superseded' }

/** An order staged from an approved version, awaiting compliance. */
export type StagedOrder = { id: string; proposalId: string; version: number; accountId: string; symbol: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; currency: CurrencyCode; status: 'pending_compliance' | 'withdrawn'; stagedAt: string; approvalActId: string }

/** Where a proposal stands: approved on one version (possibly behind the latest), or not approved. */
export type ApprovalState =
  | { kind: 'unapproved'; latestVersion: number }
  | { kind: 'approved'; version: number; latestVersion: number; approverId: string; actId: string }

/** A proposal as the API serves it: its approval state and staged orders included. */
export type ProposalDetail = Proposal & { approval: ApprovalState; staged: StagedOrder[] }
