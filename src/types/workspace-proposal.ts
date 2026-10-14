import type { AssetClass, DriftStatus } from './portfolio'
import type { CurrencyCode } from './currency'
import type { VersionAuthor } from './workspace'
import type { PreTradeCheckProposalResult, ProposedTrade, RebalancePreview } from '@/services/oms'

/** A rule the Proposal Agent must honour when it drafts or revises the legs. */
export type ProposalConstraint =
  | { kind: 'harvest_only' }
  /** Upper bound on the proposal's realized gains, gain legs only and losses not netted, in the account's currency. */
  | { kind: 'cap_realized_gains'; usd: number }
  | { kind: 'exclude_asset_class'; assetClass: AssetClass }
  | { kind: 'avoid_self_wash' }

/** A workbench change applied on top of the agent's legs; the engine re-validates it. */
export type LegEdit =
  | { kind: 'exclude'; symbol: string }
  | { kind: 'quantity'; symbol: string; quantity: number }
  | { kind: 'lots'; symbol: string; lotIds: string[] }

/**
 * What a sale takes from one lot: the shares, and the result they realize (signed, whole dollars)
 * by holding period. A leg's takes sum to its quantity and, by character, to its realized results.
 */
export type LotTake = { lotId: string; shares: number; realized: number; character: 'short' | 'long' }

/**
 * What each sell leg disposes of: its lots in sale order, what it takes from each (empty for a
 * tax-advantaged account, which realizes nothing), and the part of its loss §1091 washes (≤ 0).
 */
export type LegFacts = { symbol: string; lotIds: string[]; lots: LotTake[]; washed: number }

/** A leg the workbench or a constraint removed, kept so the version still shows what was dropped. */
export type ExcludedLeg = Pick<ProposedTrade, 'symbol' | 'name' | 'side' | 'quantity' | 'estimatedValue'>

/**
 * A buy the Proposal Agent moved off a security the Harvest Scanner flags for this taxpayer, so the
 * flagged loss is not foreclosed (a sale within thirty days of the purchase would be washed).
 * `harvested`: the loss sat in this account, and the version sells its loss lots now.
 */
export type HarvestSubstitution = {
  assetClass: AssetClass
  foreclosed: { symbol: string; name: string }
  bought: { symbol: string; name: string }
  harvested: boolean
}

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
  /** The account's drift when the version was built: the Before its trades are measured from. A record, outside the fingerprint. */
  driftBefore: DriftStatus
  pretrade: PreTradeCheckProposalResult
  legFacts: LegFacts[]
  excludedLegs: ExcludedLeg[]
  harvestSubstitutions: HarvestSubstitution[]
  summary: ProposalTaxSummary
  fingerprint: string
  changeSummary: string
}

/** A version-shaped result that has not been saved, for previewing workbench edits. */
export type DraftPreview = Pick<ProposalVersion, 'preview' | 'driftBefore' | 'pretrade' | 'legFacts' | 'excludedLegs' | 'harvestSubstitutions' | 'summary' | 'fingerprint'>

/** A proposal for one account, with every version it has had. */
export type Proposal = { id: string; title: string; accountId: string; clientId: string; threadId: string; versions: ProposalVersion[] }

/**
 * The approval of one exact version, pinned to its fingerprint and the binding act that recorded it.
 * It leaves `active` when the approver withdraws it, a newer approval supersedes it, compliance
 * returns it to the advisor, or compliance releases its orders.
 */
export type ApprovalRecord = { proposalId: string; version: number; fingerprint: string; actId: string; approverId: string; at: string; status: 'active' | 'withdrawn' | 'superseded' | 'returned' | 'released' }

export type StagedOrderStatus = 'pending_compliance' | 'withdrawn' | 'returned' | 'filled'

/** An order staged from an approved version. Compliance releases it (filled) or returns it; the approver may withdraw it. */
export type StagedOrder = {
  id: string; proposalId: string; version: number; accountId: string; symbol: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number
  currency: CurrencyCode; status: StagedOrderStatus; stagedAt: string; approvalActId: string
  /** The act that withdrew, returned or released it. */
  closedByActId?: string
  fillId?: string
}

/** One released order executed at the frozen day's price, inside the NYSE session. `value` is quantity × price, to the cent. */
export type Fill = {
  id: string; stagedOrderId: string; proposalId: string; version: number; accountId: string; symbol: string; name: string
  side: 'buy' | 'sell'; quantity: number; price: number; value: number; currency: CurrencyCode; at: string
}

/** Where a proposal stands: approved on one version (possibly behind the latest), released and filled, or not approved. */
export type ApprovalState =
  | { kind: 'unapproved'; latestVersion: number }
  | { kind: 'approved'; version: number; latestVersion: number; approverId: string; actId: string }
  | { kind: 'released'; version: number; latestVersion: number; approverId: string; actId: string; releaseActId: string }

/** Compliance escalated the active approval's orders: they stay held. */
export type Escalation = { actId: string; at: string }

/** A proposal as the API serves it: its approval state, staged orders, fills and any escalation included. */
export type ProposalDetail = Proposal & { approval: ApprovalState; staged: StagedOrder[]; fills: Fill[]; escalation?: Escalation }
