import { get, post } from './api-client'
import type { TradableAssetClass, TradeSide, TradeOrderType, TimeInForce, BondPriceType, MutualFundAmountType } from '@/types/trading'
import type { CurrencyCode } from '@/types/currency'
import type { WashedLoss } from '@/lib/wash-sale'

export type Order = {
  id: string
  accountId: string
  symbol: string
  side: string
  quantity: number
  orderType: string
  limitPrice?: number
  stopPrice?: number
  status: 'pending' | 'submitted' | 'filled' | 'cancelled'
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

export type TradeRequest = {
  accountId: string
  symbol: string
  side: TradeSide | string
  quantity: number
  orderType: TradeOrderType | string
  limitPrice?: number
  stopPrice?: number
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
  estimatedValue?: number
  commission?: number
}

export type RebalanceRequest = {
  accountIds: string[]
  driftThreshold: number
  taxAware: boolean
}

export type RebalancePreview = {
  accountId: string
  // §9.3 · currencies-and-fx — the account's own base currency (`accounts.ts`'s `baseCurrency`,
  // defaulting to USD). Every trade in `trades` carries the same tag, and every notional on this
  // preview (`estimatedTaxImpact`, each trade's `estimatedValue`/`taxImpact`) is denominated in it,
  // not USD — `oms.ts`'s trade generator derives everything from `account.totalValue`, which is
  // native currency. A consumer must convert before summing across previews of different accounts.
  currency: CurrencyCode
  trades: ProposedTrade[]
  /**
   * The tax this proposal adds to its owner's return: its legs netted under IRC §1222 with the
   * return's year-to-date realised results and with earlier accounts in this batch on the same
   * return (`nettedWithAccountIds`). Never another taxpayer's results. Signed, and not bounded by
   * `grossTaxOnGains` (`additionalCapitalGainsTax` has the reasoning):
   * - negative when the proposal saves tax — its losses offset gains already realised this year —
   *   but never by more than the tax those results already owe;
   * - at most `grossTaxOnGains` (to rounding) when what it nets against is a gain or nil in both
   *   short- and long-term;
   * - above `grossTaxOnGains` when its gains use up a loss that was sheltering a gain of the other
   *   character.
   * Capital-gains tax only: the §1211(b) ordinary-income offset and §1212 carryforwards are not
   * modelled.
   */
  estimatedTaxImpact: number
  /** Year-to-date realised results on this account's return; `null` when it is on none (an IRA, a Roth). */
  ytdRealisedOnReturn: { shortTerm: number; longTerm: number; collectibleLongTerm: number } | null
  /** Accounts earlier in this batch, on the same return, whose proposals this estimate nets against. */
  nettedWithAccountIds: string[]
  /**
   * Sum of the legs' `taxImpact`: this proposal's own tax on its gains, each gain lot at its own
   * rate, with no loss netted and no year-to-date result considered. A reference figure, not a cap
   * on `estimatedTaxImpact`, which can exceed it.
   */
  grossTaxOnGains: number
  /** False for an IRA, Roth or other tax-advantaged account, where a sale realises nothing taxable. */
  taxable: boolean
  /**
   * IRC §1091 repurchase restrictions on this account: windows opened by loss sales already
   * recorded, and windows this batch's own loss legs would open, by any account of the same
   * wash-sale taxpayer (owner and spouse, their IRAs and Roths included; a trust or entity stands
   * alone). Sorted by `until`, then `symbol`.
   */
  repurchaseRestrictions: RepurchaseRestriction[]
}

/**
 * A window in which buying `symbol` back would wash a loss (IRC §1091): 30 days either side of the
 * loss sale, inclusive. `recorded` windows come from sales already made (`realisedSales`);
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

export type ProposedTrade = {
  symbol: string
  name: string
  side: 'buy' | 'sell'
  quantity: number
  estimatedValue: number
  taxImpact: number
  /** Realised result of this leg by holding period, signed (loss < 0), account currency. 0 for buys. */
  realisedShortTerm: number
  realisedLongTerm: number
  /** The part of `realisedLongTerm` that is collectibles gain or loss (GLD and other physical-metal trusts), taxed at up to 28% + NIIT. */
  realisedCollectibleLongTerm: number
  washSaleRisk: boolean
  /**
   * Sell legs that realise a loss only: the part of it IRC §1091 washes because the taxpayer bought
   * the symbol in the last 30 days or this batch buys it today in any of the taxpayer's accounts
   * (Treas. Reg. §1.1091-1(c), pro rata to the replaced shares; `settleBatchWashSales`).
   * Signed like the loss (≤ 0), account currency; `realisedShortTerm`/`realisedLongTerm` still
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

export type RebalanceExecution = {
  accountId: string
  status: 'submitted' | 'completed' | 'failed'
  ordersCreated: number
  estimatedCompletion: string
}

export function submitTrade(request: TradeRequest) {
  return post<Order>('/oms/orders', request)
}

export function getOrders(params?: Record<string, string>) {
  return get<Order[]>('/oms/orders', params)
}

/**
 * Preview a rebalance without executing it. `submitRebalance` is the same request — one
 * endpoint, one function underneath both names.
 */
export function previewRebalance(request: { accountIds: string[]; taxAware: boolean; driftThreshold?: number }) {
  return post<RebalancePreview[]>('/oms/rebalance', request)
}

export function submitRebalance(request: RebalanceRequest) {
  return previewRebalance(request)
}

export function getExecutionStatus(orderId: string) {
  return get<Order>(`/oms/orders/${orderId}`)
}

export function executeRebalance(request: { accountIds: string[]; taxAware: boolean }) {
  return post<RebalanceExecution[]>('/oms/rebalance/execute', request)
}

// Pre-trade compliance

export type PreTradeViolation = {
  constraint: string
  severity: 'block' | 'warning'
  currentValue: string
  limit: string
  message: string
}

export type PreTradeCheckResult = {
  passed: boolean
  violations: PreTradeViolation[]
}

export type PreTradeCheckRequest = {
  accountId: string
  symbol: string
  side: string
  quantity: number
  // C28 · pre-trade-compliance — required, not inferred. A missing notional previously fell back
  // to `quantity * 100`, making concentration limits evadable by trading high-priced securities.
  estimatedValue: number
}

export function preTradeCheck(request: PreTradeCheckRequest) {
  return post<PreTradeCheckResult>('/oms/orders/pre-check', request)
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
  /** Required and positive, as on `PreTradeCheckRequest` (C28). Account currency. */
  estimatedValue: number
}

export type PreTradeCheckProposalRequest = {
  accountId: string
  trades: ProposalTradeLeg[]
}

export type ProposalConstraint =
  | 'restricted_securities'
  | 'concentration_limit'
  | 'sector_limit'
  | 'cash_minimum'
  | 'wash_sale'

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

export function preTradeCheckProposal(request: PreTradeCheckProposalRequest) {
  return post<PreTradeCheckProposalResult>('/oms/orders/pre-check-proposal', request)
}
