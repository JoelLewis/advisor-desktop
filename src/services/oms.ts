import { post } from './api-client'
import type { TradableAssetClass, TimeInForce, BondPriceType, MutualFundAmountType } from '@/types/trading'
import type { CurrencyCode } from '@/types/currency'
import type { AssetClass } from '@/types/portfolio'
import type { WashedLoss } from '@/lib/wash-sale'
import type { WholeStatus } from '@/types/reference-risk'

/** Previews and checks read the firm's book: each request names its viewer, and an outsider is told they do not exist. */
const as = (viewer: string) => ({ 'X-Viewer': viewer })

export type Order = {
  id: string
  accountId: string
  symbol: string
  side: string
  quantity: number
  orderType: string
  limitPrice?: number
  stopPrice?: number
  status: 'pending' | 'submitted' | 'filled' | 'canceled'
  filledQuantity: number
  filledPrice?: number
  submittedAt: string
  filledAt?: string
  assetClass?: TradableAssetClass
  timeInForce?: TimeInForce
  extendedHours?: boolean
  // Option fields
  underlying?: string
  optionType?: 'call' | 'put'
  strikePrice?: number
  expirationDate?: string
  contractMultiplier?: number
  // Mutual fund fields
  amountType?: MutualFundAmountType
  dollarAmount?: number
  exchangeTargetSymbol?: string
  // Fixed income fields
  parAmount?: number
  bondPriceType?: BondPriceType
  priceOrYield?: number
  // Digital asset
  fractionalQuantity?: boolean
  // Computed
  estimatedValue?: number
  commission?: number
}

export type RebalancePreview = {
  accountId: string
  // The account's own base currency (`accounts.ts`'s `baseCurrency`,
  // defaulting to USD). Every trade in `trades` carries the same tag, and every notional on this
  // preview (`estimatedTaxImpact`, each trade's `estimatedValue`/`taxImpact`) is denominated in it,
  // not USD — `oms.ts`'s trade generator derives everything from `account.totalValue`, which is
  // native currency. A consumer must convert before summing across previews of different accounts.
  currency: CurrencyCode
  trades: ProposedTrade[]
  /**
   * The tax this proposal adds to its owner's return: its legs netted under IRC §1222 with the
   * return's year-to-date realized results and with earlier accounts in this batch on the same
   * return (`nettedWithAccountIds`). Never another taxpayer's results. Signed, and not bounded by
   * `grossTaxOnGains` (`additionalCapitalGainsTax` has the reasoning):
   * - negative when the proposal saves tax — its losses offset gains already realized this year —
   *   but never by more than the tax those results already owe;
   * - at most `grossTaxOnGains` (to rounding) when what it nets against is a gain or nil in each
   *   rate group: short-term, long-term collectibles and other long-term;
   * - above `grossTaxOnGains` when its gains use up a loss that was sheltering a gain of another
   *   group (including a collectibles gain sheltered by an ordinary long-term loss).
   * Capital-gains tax only: the §1211(b) ordinary-income offset and §1212 carryforwards are not
   * modeled.
   */
  estimatedTaxImpact: number
  /** Year-to-date realized results on this account's return; `null` when it is on none (an IRA, a Roth). */
  ytdRealizedOnReturn: { shortTerm: number; longTerm: number; collectibleLongTerm: number } | null
  /** Accounts earlier in this batch, on the same return, whose proposals this estimate nets against. */
  nettedWithAccountIds: string[]
  /**
   * Sum of the legs' `taxImpact`: this proposal's own tax on its gains, each gain lot at its own
   * rate, with no loss netted and no year-to-date result considered. A reference figure, not a cap
   * on `estimatedTaxImpact`, which can exceed it.
   */
  grossTaxOnGains: number
  /** False for an IRA, Roth or other tax-advantaged account, where a sale realizes nothing taxable. */
  taxable: boolean
  /**
   * IRC §1091 repurchase restrictions on this account: windows opened by loss sales already
   * recorded, and windows this batch's own loss legs would open, by any account of the same
   * wash-sale taxpayer (owner and spouse, their IRAs and Roths included; a trust or entity stands
   * alone). Sorted by `until`, then `symbol`.
   */
  repurchaseRestrictions: RepurchaseRestriction[]
  /** Drift by asset class after the proposed trades, from the same drift function as current drift. */
  projectedDrift: ProjectedDrift
}

/**
 * A window in which buying `symbol` back would wash a loss (IRC §1091): 30 days either side of the
 * loss sale, inclusive. `recorded` windows come from sales already made (`realizedSales`);
 * `projected` windows are the ones a proposal's own loss legs would open if executed today. The two
 * are never merged: a reviewer needs to see both that a window exists and that a proposal extends it.
 */
export type RepurchaseRestriction = {
  symbol: string
  start: string
  until: string
  source:
    | { kind: 'recorded'; saleId: string; accountId: string; saleDate: string }
    | { kind: 'projected'; accountId: string; saleDate: string }
}

/**
 * Why an asset class is still away from target after the proposed trades. The last four are a
 * proposal constraint (or a workbench exclusion) holding the class back.
 */
export type ResidualDriftReason =
  | 'not_market_tradable' | 'cash_capped' | 'replacement_hold' | 'below_lot_size'
  | 'excluded_by_constraint' | 'harvest_only' | 'gains_capped' | 'wash_sale_avoided'

type ProjectedAssetClassDrift = {
  assetClass: AssetClass
  target: number
  actual: number
  /** Signed, rounded to 4dp, exactly as `DriftStatus.assetClassDrifts[].drift`. */
  drift: number
  /** Present on every invested (non-cash) class whose |drift| still exceeds the proposal's threshold. */
  residualReason?: ResidualDriftReason
}

export type ProjectedDrift = {
  driftTolerance: number
  /** The threshold the trades were generated against; a residual is drift beyond it. */
  driftThreshold: number
  totalDrift: number
  maxAbsDrift: number
  /** `maxAbsDrift` within the model's own band. */
  withinBand: boolean
  assetClassDrifts: ProjectedAssetClassDrift[]
}

export type ProposedTrade = {
  symbol: string
  name: string
  side: 'buy' | 'sell'
  quantity: number
  estimatedValue: number
  taxImpact: number
  /** Realized result of this leg by holding period, signed (loss < 0), account currency. 0 for buys. */
  realizedShortTerm: number
  realizedLongTerm: number
  /** The part of `realizedLongTerm` that is collectibles gain or loss (GLD and other physical-metal trusts), taxed at up to 28% + NIIT. */
  realizedCollectibleLongTerm: number
  washSaleRisk: boolean
  /**
   * Sell legs that sell any loss lot, judged per lot (so a leg that nets to a gain can carry it):
   * the part of those lots' loss IRC §1091 washes because the taxpayer bought the symbol in the
   * last 30 days or this batch buys it today in any of the taxpayer's accounts (Treas. Reg.
   * §1.1091-1(c), pro rata to the replaced shares; `settleBatchWashSales`).
   * Signed like the loss (≤ 0), account currency; `realizedShortTerm`/`realizedLongTerm` still
   * include it. The tax estimate nets only the rest. Absent when nothing washes.
   */
  washedLoss?: WashedLoss & { collectibleLongTerm: number }
  /**
   * Sell legs that sell any loss share §1091 has not already washed (judged per lot, so a net-gain
   * leg can carry one): the last day of the IRC §1091 window the sale opens if executed today —
   * the sale date plus 30 days. Buying the symbol back before then, in any account of the same
   * taxpayer, washes the loss. Absent when every loss share is already washed, and on a coin held
   * directly, which §1091 does not reach (`isSubjectToWashSale`).
   */
  repurchaseBlockedUntil?: string
  // Same account-native currency as the parent `RebalancePreview.currency` — carried on the trade
  // itself so a consumer that only has the trade (not the preview) still knows what it's reading.
  currency: CurrencyCode
}

/**
 * Preview a rebalance without executing it. `submitRebalance` is the same request — one
 * endpoint, one function underneath both names.
 */
export function previewRebalance(viewer: string, request: { accountIds: string[]; taxAware: boolean; driftThreshold?: number; modelId?: string }) {
  return post<RebalancePreview[]>('/oms/rebalance', request, as(viewer))
}

// Pre-trade compliance

type PreTradeViolation = {
  constraint: string
  severity: 'block' | 'warning'
  currentValue: string
  limit: string
  message: string
}

// Proposal-level pre-trade compliance — every leg of a multi-leg proposal (a rebalance) applied
// to one projected portfolio, then the end state checked. `preTradeCheck` above reads one order
// against current holdings, which is right for the single-trade ticket and wrong for a proposal:
// a buy cannot see the proposal's own sale proceeds, and a trim cannot see that it moves a
// position toward its limit.

export type ProposalTradeLeg = {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  /** Required and positive, as on `PreTradeCheckRequest`. Account currency. */
  estimatedValue: number
}

export type PreTradeCheckProposalRequest = {
  accountId: string
  trades: ProposalTradeLeg[]
}

type ProposalConstraint =
  | 'restricted_securities'
  | 'concentration_limit'
  | 'sector_limit'
  | 'cash_minimum'
  | 'wash_sale'
  | 'model_above_tolerance'
  | 'working_order'

/** A working order a proposal leg overlaps: the order already open on the same security. */
/** A working order a proposal counted: `quantityUnit` says what its quantity counts (shares, option contracts, or a bond's par). */
export type WorkingOrderRef = { orderId: string; symbol: string; side: 'buy' | 'sell'; quantity: number; quantityUnit: 'sh' | 'contracts' | 'par'; limitPrice?: number }

export type ProposalViolation = PreTradeViolation & {
  category: ProposalConstraint
  /** Indexes into the request's `trades` that cause or add to this violation. Empty when no leg does (a pre-existing breach the proposal leaves alone). */
  legs: number[]
  /** The account was already over the limit before the proposal. */
  preExisting: boolean
  symbol?: string
  /** Weights as fractions of account value. Absent for rules that are not a weight. */
  currentWeight?: number
  projectedWeight?: number
  limitWeight?: number
  /** The working-order check: the order already open on the leg's security. */
  workingOrder?: WorkingOrderRef
  /** The model-above-tolerance check: the model, the client's tolerance it was measured against, and the client's accounts as a whole after the proposal (and today) against the same band. */
  tolerance?: {
    modelName: string; modelBand: string; modelScore: number; clientName: string; toleranceBand: string; floor: number; ceiling: number
    wholeAfterScore: number; wholeAfterStatus: WholeStatus; wholeTodayScore: number
  }
}

export type ProposalLegResult = {
  index: number
  symbol: string
  side: 'buy' | 'sell'
  /** The worst severity among the violations this leg is attributed to. */
  severity: 'pass' | 'warning' | 'block'
}

export type PreTradeCheckProposalResult = {
  accountId: string
  passed: boolean
  violations: ProposalViolation[]
  legs: ProposalLegResult[]
  /** End-state cash after sells settle and buys are paid for, account currency. */
  projectedCash: number
  projectedCashPct: number
  /** The 2% reserve floor, account currency. */
  minimumCash: number
}

export function preTradeCheckProposal(viewer: string, request: PreTradeCheckProposalRequest) {
  return post<PreTradeCheckProposalResult>('/oms/orders/pre-check-proposal', request, as(viewer))
}
