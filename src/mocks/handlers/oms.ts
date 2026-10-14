import { http, HttpResponse } from 'msw'
import type { Order, RebalancePreview, ProposedTrade, PreTradeCheckProposalRequest, ProjectedDrift, ResidualDriftReason } from '@/services/oms'
import { notFound } from './utils'
import { evaluateProposal, invalidProposal } from './compliance'
import { computeDriftForAccount, computeDriftForHoldings, modelImplementationSecurity, usdQuoteFor, type DriftHolding } from './pms'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { convertCurrency } from '@/lib/currency'
import type { HarvestSubstitution } from '@/types/workspace-proposal'
import { isMarketTradable, isSubjectToWashSale, taxCharacterOf, SPOT_CRYPTO_SYMBOLS } from '@/lib/security-master'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { hasWashSaleRisk, isoDaysBefore, type SoldLossLot } from '@/lib/wash-sale'
import { estimateTaxOnReturns, openWashSaleWindowsFor } from './tax-return'
import { generateTaxLots, boundedTradeQty, washSaleAcquisitions, type CustodianLot } from './custodian'
import { repurchaseRestrictionsFor } from './repurchase-restrictions'
import { settleBatchWashSales, type LegSale } from './batch-wash-sales'
import { taxRateFor } from '@/lib/tax-rules'
import type { Account } from '@/types/account'
import { UnknownModelError, modelIdFor } from '@/lib/mandate'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import type { LotTake } from '@/types/workspace-proposal'
import type { AssetClass, Position } from '@/types/portfolio'
import type { CurrencyCode } from '@/types/currency'

// Exported so `ai.ts`'s trading-desk chat response reads the same pending-order counts this
// handler serves, rather than a second, independently hand-typed "3 open orders" figure.
//
// Every timestamp is real UTC, as `clock.ts` reads it (12:00Z is 7:00 ET). Fills
// were written as New York time with a Z, so several read as pre-market fills; they now fall in the
// regular session, 14:30–21:00Z before daylight time starts on 2026-03-08. Pending orders submitted
// before 12:00Z today are pre-market submissions still waiting for the open. ord-014, which filled on
// Sunday 2026-02-22, filled on Friday 2026-02-20. BTC (ord-015) trades every day.
export const orders: Order[] = [
  // ── Recent orders for Johnson Family Trust (acc-001) ──
  { id: 'ord-001', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 150, orderType: 'market', status: 'filled', filledQuantity: 150, filledPrice: 268.35, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:02Z', assetClass: 'equity' },
  { id: 'ord-002', accountId: 'acc-001', symbol: 'AGG', side: 'buy', quantity: 500, orderType: 'market', status: 'filled', filledQuantity: 500, filledPrice: 98.42, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:01Z', assetClass: 'equity' },
  { id: 'ord-003', accountId: 'acc-001', symbol: 'NVDA', side: 'sell', quantity: 25, orderType: 'limit', limitPrice: 785.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:31:00Z', assetClass: 'equity' },

  // ── Robert Johnson Individual (acc-002) ──
  // This fill is the same event as rs-001, so it prices at rs-001's $142,250 / 5,000 shares
  // and acc-002's INTC position now shows the 7,000 shares left after it. It
  // filled Friday 2026-02-20 at 10:15 ET (15:15Z).
  { id: 'ord-004', accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, orderType: 'market', status: 'filled', filledQuantity: 5000, filledPrice: 28.45, submittedAt: '2026-02-20T15:15:00Z', filledAt: '2026-02-20T15:15:03Z', assetClass: 'equity' },
  { id: 'ord-005', accountId: 'acc-002', symbol: 'QQQ', side: 'buy', quantity: 200, orderType: 'limit', limitPrice: 480.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:35:00Z', assetClass: 'equity' },

  // ── Chen Irrevocable Trust (acc-006) ──
  { id: 'ord-006', accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 800, orderType: 'market', status: 'filled', filledQuantity: 800, filledPrice: 268.40, submittedAt: '2026-02-20T16:00:00Z', filledAt: '2026-02-20T16:00:04Z', assetClass: 'equity' },
  { id: 'ord-007', accountId: 'acc-006', symbol: 'TLT', side: 'sell', quantity: 300, orderType: 'market', status: 'filled', filledQuantity: 300, filledPrice: 95.65, submittedAt: '2026-02-20T16:00:00Z', filledAt: '2026-02-20T16:00:02Z', assetClass: 'equity' },

  // ── David Williams Individual (acc-011) ──
  { id: 'ord-008', accountId: 'acc-011', symbol: 'SPY', side: 'buy', quantity: 100, orderType: 'market', status: 'submitted', filledQuantity: 0, submittedAt: '2026-02-25T10:00:00Z', assetClass: 'equity' },
  { id: 'ord-009', accountId: 'acc-011', symbol: 'BND', side: 'sell', quantity: 200, orderType: 'market', status: 'canceled', filledQuantity: 0, submittedAt: '2026-02-24T15:45:00Z', assetClass: 'equity' },

  // ── Michael Martinez Individual (acc-015) ──
  { id: 'ord-010', accountId: 'acc-015', symbol: 'EFA', side: 'buy', quantity: 350, orderType: 'limit', limitPrice: 81.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:45:00Z', assetClass: 'equity' },
  { id: 'ord-011', accountId: 'acc-015', symbol: 'GLD', side: 'sell', quantity: 50, orderType: 'market', status: 'filled', filledQuantity: 50, filledPrice: 215.80, submittedAt: '2026-02-24T18:20:00Z', filledAt: '2026-02-24T18:20:01Z', assetClass: 'equity' },
  { id: 'ord-012', accountId: 'acc-015', symbol: 'VNQ', side: 'buy', quantity: 200, orderType: 'market', status: 'filled', filledQuantity: 200, filledPrice: 89.15, submittedAt: '2026-02-24T18:20:00Z', filledAt: '2026-02-24T18:20:02Z', assetClass: 'equity' },

  // ── Multi-asset orders ──
  // A mutual fund order cannot fill at 11:00 ET. Rule 22c-1 requires forward pricing at the
  // next computed NAV, which for VFIAX is 4:00 PM ET (21:00Z), and a $25,000 dollar-amount purchase
  // buys $25,000 / $465.32 shares, not the placeholder 1.
  //
  // 53.72647 — five decimals, because no shorter rounding reconciles: 53.73 multiplies out to
  // $25,001.64, and 53.727 to $25,000.25, while 53.72647 x 465.32 = $25,000.00103, which agrees with
  // `dollarAmount` to the cent. Fractional-share precision beyond the three decimals retail
  // statements usually display is a settlement-layer detail; the arithmetic is the reason here, not
  // a claim about any particular clearing system's record layout.
  { id: 'ord-013', accountId: 'acc-001', symbol: 'VFIAX', side: 'purchase', quantity: 53.72647, orderType: 'market', status: 'filled', filledQuantity: 53.72647, filledPrice: 465.32, submittedAt: '2026-02-23T15:00:00Z', filledAt: '2026-02-23T21:00:00Z', assetClass: 'mutual_fund', dollarAmount: 25000, amountType: 'dollars' },
  { id: 'ord-014', accountId: 'acc-002', symbol: 'UST-10Y', side: 'buy', quantity: 50, orderType: 'limit', limitPrice: 95.25, status: 'filled', filledQuantity: 50, filledPrice: 95.20, submittedAt: '2026-02-20T15:30:00Z', filledAt: '2026-02-20T15:30:05Z', assetClass: 'fixed_income', parAmount: 50000, bondPriceType: 'price', priceOrYield: 95.25 },
  // Spot BTC settled into acc-002, a Schwab brokerage that can only hold the IBIT and ETHE
  // ETFs. It belongs in acc-045, the Coinbase account that actually custodies coins, and at the one
  // BTC price the app knows.
  { id: 'ord-015', accountId: 'acc-045', symbol: 'BTC', side: 'buy', quantity: 0.25, orderType: 'market', status: 'filled', filledQuantity: 0.25, filledPrice: 87_450.00, submittedAt: '2026-02-21T14:15:00Z', filledAt: '2026-02-21T14:15:01Z', assetClass: 'digital_asset', fractionalQuantity: true },
  { id: 'ord-016', accountId: 'acc-006', symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, orderType: 'limit', limitPrice: 8.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T11:00:00Z', assetClass: 'option', underlying: 'AAPL', optionType: 'call', strikePrice: 185, expirationDate: '2026-03-21', contractMultiplier: 100 },
]

/**
 * The one place an account's native currency is resolved for the
 * rebalance surface, so the preview and every trade on it read the same fact instead of each
 * re-deriving (and potentially disagreeing on) the USD fallback for an account with no
 * `baseCurrency` set.
 */
export function currencyForAccount(accountId: string): CurrencyCode {
  return accounts.find((a) => a.id === accountId)?.baseCurrency ?? 'USD'
}

/** A take before it is tied to the leg's quantity, with the shares its lot holds. */
type RawTake = LotTake & { held: number }

/** How far the takes' shares may sit from the leg's quantity: a fraction of it, plus a dollar's worth (see `takesForQuantity`). */
const SHARE_RECONCILIATION = 0.01
const ROUNDING_USD = 1

/**
 * Ties a sale's takes to the leg's quantity. The sale is drawn by value, and a fixture lot's value
 * per share is not exactly the position's price (and the executed value is rounded once), so the
 * shares by value differ slightly from the quantity (for a one-share leg of a low-priced security,
 * the dollar rounding alone is a large part of a share). The difference is settled from the last
 * take backwards, never past what a lot holds or below nothing. A gap beyond `SHARE_RECONCILIATION`
 * of the quantity plus `ROUNDING_USD` at `price`, or one the lots cannot settle, throws.
 */
function takesForQuantity(takes: readonly RawTake[], quantity: number, price: number): LotTake[] {
  if (takes.length === 0) return []
  const shares = takes.map((t) => t.shares)
  const gap = quantity - shares.reduce((s, v) => s + v, 0)
  if (Math.abs(gap) > SHARE_RECONCILIATION * quantity + ROUNDING_USD / price) throw new Error(`takesForQuantity: the lots give ${quantity - gap} shares for a ${quantity}-share leg`)
  let left = gap
  for (let i = takes.length - 1; i >= 0 && left !== 0; i--) {
    const current = shares[i] ?? 0
    const next = Math.min(takes[i]?.held ?? 0, Math.max(0, current + left))
    left -= next - current
    shares[i] = next
  }
  if (Math.abs(left) > 1e-9) throw new Error(`takesForQuantity: the lots cannot give the ${quantity}-share leg its shares`)
  return takes.map(({ held: _held, ...take }, i) => ({ ...take, shares: shares[i] ?? 0 }))
}

/**
 * `soldLosses`: the shares of each lot sold at a loss, which §1091 may wash (`washedLoss`).
 * `lotTakes`: what the sale takes from each lot; the shares are drawn by value, not yet tied to the
 * leg's quantity (`takesForQuantity`).
 */
type RealizedSale = { shortTerm: number; longTerm: number; collectibleLongTerm: number; tax: number; consumedLotIds: string[]; soldLosses: SoldLossLot[]; lotTakes: RawTake[] }
const NOTHING_REALIZED: RealizedSale = { shortTerm: 0, longTerm: 0, collectibleLongTerm: 0, tax: 0, consumedLotIds: [], soldLosses: [], lotTakes: [] }

/** Rounds each value to whole dollars so they sum to `total`, moving the gap onto the largest remainders. */
function roundToTotal(values: readonly number[], total: number): number[] {
  const rounded = values.map(Math.round)
  let gap = total - rounded.reduce((s, v) => s + v, 0)
  const byRemainder = values.map((v, i) => ({ i, remainder: v - Math.round(v) })).sort((a, b) => (gap > 0 ? b.remainder - a.remainder : a.remainder - b.remainder))
  for (const { i } of byRemainder) {
    if (gap === 0) break
    const step = Math.sign(gap)
    rounded[i] = (rounded[i] ?? 0) + step
    gap -= step
  }
  if (gap !== 0) throw new Error(`roundToTotal: ${values.length} values cannot round to ${total}`)
  return rounded
}

/**
 * Lots ordered for a tax-aware sale: least tax per dollar sold first, so losses go first, then the
 * cheapest gains. Ranked by *tax per dollar sold*, not gain per dollar sold: a low-gain short-term
 * lot (40.8% rate) can carry more tax than a low-gain long-term lot (23.8% rate), so sorting by gain
 * fraction alone can pick a worse-taxed lot first.
 */
function taxAwareLotOrder(lots: readonly CustodianLot[], symbol: string): CustodianLot[] {
  const character = taxCharacterOf(symbol)
  const taxPerDollar = (l: CustodianLot) => (l.gainLoss / l.currentValue) * taxRateFor(l.holdingPeriod, character)
  return [...lots].sort((a, b) => taxPerDollar(a) - taxPerDollar(b))
}

/** Realize a sale of `notional` drawn from `ordered` in exactly that order. */
function realizeOrderedLots(ordered: readonly CustodianLot[], symbol: string, notional: number): RealizedSale {
  if (ordered.length === 0 || notional <= 0) return NOTHING_REALIZED
  // GLD's long-term gain is collectibles gain (31.8%), not 23.8%.
  const character = taxCharacterOf(symbol)
  const rateFor = (holdingPeriod: CustodianLot['holdingPeriod']) => taxRateFor(holdingPeriod, character)
  let remaining = notional
  let shortTerm = 0
  let longTerm = 0
  let tax = 0
  const consumedLotIds: string[] = []
  const soldLosses: SoldLossLot[] = []
  const rawTakes: RawTake[] = []
  for (const lot of ordered) {
    if (remaining <= 0 || lot.currentValue <= 0) continue
    const portion = Math.min(1, remaining / lot.currentValue)
    consumedLotIds.push(lot.id)
    const realized = lot.gainLoss * portion
    rawTakes.push({ lotId: lot.id, shares: lot.quantity * portion, realized, character: lot.holdingPeriod, held: lot.quantity })
    if (lot.holdingPeriod === 'short') shortTerm += realized
    else longTerm += realized
    if (realized > 0) tax += realized * rateFor(lot.holdingPeriod)
    if (realized < 0) {
      soldLosses.push({
        lotId: lot.id, symbol, purchaseDate: lot.purchaseDate,
        quantity: lot.quantity * portion, loss: realized, holdingPeriod: lot.holdingPeriod,
      })
    }
    remaining -= lot.currentValue * portion
  }
  const roundedLongTerm = Math.round(longTerm)
  const roundedShortTerm = Math.round(shortTerm)
  // Each take's result in whole dollars, summing by character to the sale's rounded results.
  const wholeDollars = new Map<RawTake, number>()
  for (const [character, total] of [['short', roundedShortTerm], ['long', roundedLongTerm]] as const) {
    const ofCharacter = rawTakes.filter((t) => t.character === character)
    roundToTotal(ofCharacter.map((t) => t.realized), total).forEach((v, i) => { const t = ofCharacter[i]; if (t) wholeDollars.set(t, v) })
  }
  const lotTakes = rawTakes.map((t) => ({ ...t, realized: wholeDollars.get(t) ?? 0 }))
  return {
    shortTerm: roundedShortTerm,
    longTerm: roundedLongTerm,
    collectibleLongTerm: character === 'collectible' ? roundedLongTerm : 0,
    tax: Math.max(0, Math.round(tax)),
    consumedLotIds,
    soldLosses,
    lotTakes,
  }
}

/**
 * Realize a sale of `notional` dollars out of `target`: the signed short- and long-term result
 * and the capital-gains tax on its gains, using the book's per-lot generator (`generateTaxLots`) and the same rate function
 * (`taxRateFor`) it applies — a short-term-heavy sell is taxed at `SHORT_TERM_RATE` (40.8%), not
 * silently at the long-term rate (23.8%) for the entire position. A tax-aware pass sells the lots
 * carrying the least tax per dollar sold first (`taxAwareLotOrder`); a tax-unaware pass sells the
 * lots in their own oldest-first order.
 */
function realizeSale(accountLots: readonly CustodianLot[], target: Position, notional: number, taxAware: boolean): RealizedSale {
  const lots = accountLots.filter((l) => l.positionId === target.id)
  return realizeOrderedLots(taxAware ? taxAwareLotOrder(lots, target.symbol) : lots, target.symbol, notional)
}

/**
 * What a proposed trade executes against: a symbol, its price **in the account's own currency**,
 * and — for a sell — the position being trimmed. A buy into an asset class the account holds
 * nothing in has no position, which is precisely the point.
 */
type TradeCandidate = { symbol: string; name: string; price: number; position?: Position }

/**
 * The model sleeve a leg is trading, carried alongside the leg rather than re-derived by whoever
 * needs it.
 *
 * The model-trade preview has to say *why* it proposes each trade, and its `reason`
 * string is exactly this sleeve's drift stated in words ("US Equity 47.2% against a 42.0%
 * target"). Recomputing the weights in `trading.ts` to write that sentence would put the
 * rebalance engine's arithmetic and the sentence describing it in two files, free to disagree —
 * the "one fact, two places" failure this phase exists to remove, and the one the fabricated
 * handler committed most visibly by printing "from 47% to 42%" for all 47 accounts. The engine
 * already knows these three numbers; it now hands them on instead of dropping them.
 */
type Sleeve = {
  assetClass: DriftHolding['assetClass']
  /** The account's own weight in this class, renormalized — `computeDriftForAccount`'s `actual`. */
  actualWeight: number
  /** The model's target weight for it — the same figure the drift surface bands against. */
  targetWeight: number
}

export type ProposedTradeLeg = ProposedTrade & Sleeve

/**
 * The order in which an overweight class is sold down. The engine used to take
 * `candidates[0]` — the fixture's declaration order — so acc-002 trimmed SPY, carrying a
 * $355,206.70 embedded gain, while INTC sat in the same asset class with a $45,850 unrealized
 * loss. A "tax-aware" toggle that picks a materially worse tax outcome than an obvious loss lot
 * already in the account is worse than no toggle.
 *
 * Ranking is by **gain per dollar of market value** — gain per dollar *sold*, the same
 * per-dollar logic `realizeSale` applies across lots — not by absolute gain, which would
 * simply prefer whichever position happens to be biggest. Ascending order puts losses first
 * (harvestable), then the smallest embedded gains.
 *
 * This returns the whole ordered sequence, not a single pick, because "prefer losses, then the
 * smallest embedded gain" is an ordering you draw from until the sleeve's notional is filled.
 * Stopping at the first candidate made the tax answer better and the *rebalance* worse: acc-002's
 * us_equity trim fell from $547,650 to INTC's whole $199,150 position and stopped there, leaving
 * the account overweight us_equity after a rebalance that reported success, while SPY sat in the
 * same sleeve able to absorb the rest. Sell INTC out first, then top up from SPY.
 *
 * Gated on `taxable`: in an IRA or a Roth, gains are not taxed at all (`realizeSale` already
 * returns 0 there), so re-ordering by embedded gain would be an arbitrary preference dressed up
 * as tax awareness. Those accounts keep the held order under either toggle setting.
 *
 * A tax-aware pass also never sells a position whose every lot is `recentlyOpened` (held 31 days
 * or fewer). Such a position is, in practice, a harvest replacement: acc-002's 180 SMH were
 * bought 2026-02-20 to keep semiconductor exposure after the INTC loss sale (comp-006),
 * and at zero gain they ranked ahead of SPY, so the toggle sold them five days later and undid the
 * harvest. Holding the replacement past the 31st day is the TLH practice; the sleeve then fills
 * from the next candidate as it always would.
 */
function orderSellCandidates(held: Position[], taxAware: boolean, recentlyOpened: ReadonlySet<string>): Position[] {
  if (!taxAware) return held
  const gainPerDollar = (p: Position) => (p.marketValue > 0 ? p.gainLoss / p.marketValue : 0)
  return held.filter((p) => !recentlyOpened.has(p.id)).sort((a, b) => gainPerDollar(a) - gainPerDollar(b))
}

/** How long a harvest replacement is held before a tax-aware rebalance may sell it. */
const REPLACEMENT_HOLD_DAYS = 31

/** Positions every one of whose lots was bought within the last `REPLACEMENT_HOLD_DAYS` days. */
function recentlyOpenedPositions(lots: readonly CustodianLot[], asOfISO: string): Set<string> {
  const since = isoDaysBefore(asOfISO, REPLACEMENT_HOLD_DAYS)
  const hasOlderLot = new Set(lots.filter((l) => l.purchaseDate < since).map((l) => l.positionId))
  return new Set(lots.filter((l) => !hasOlderLot.has(l.positionId)).map((l) => l.positionId))
}

/**
 * Which security to buy into an underweight class. An account that already holds the class
 * adds to what it holds; an account that holds **nothing** in it buys the model's own
 * implementation security, which is the case the engine previously could not express at all —
 * acc-041 was 94.4% international equity against a 15% target and proposed nothing, because every
 * class it needed to buy was one it held zero of.
 *
 * The currency trap this closes: notionals derive from `account.totalValue`, which is **native
 * currency** (HK$12.5M for acc-041), while a model implementation symbol is quoted in USD (VTI at
 * $268.50). Dividing an HKD notional by a USD price yields a quantity that is 7.82x too large and
 * means nothing in either currency. The price is therefore converted into the account's currency
 * once, here, at the same `FX_RATES_USD_BASE` the rest of the app reads — so `estimatedValue`
 * stays native (matching the trade's own `currency` tag) and `quantity` is a real share
 * count. A held position needs no conversion: `positions.ts` already prices each account's
 * holdings in that account's currency.
 */
function pickBuyCandidate(held: Position[], modelId: string, assetClass: string, currency: CurrencyCode): TradeCandidate | undefined {
  const position = held[0]
  if (position) return { symbol: position.symbol, name: position.name, price: position.price, position }
  const security = modelImplementationSecurity(modelId, assetClass)
  if (!security) return undefined
  return {
    symbol: security.symbol,
    name: security.name,
    price: convertCurrency(security.price, 'USD', currency, FX_RATES_USD_BASE),
  }
}

/**
 * A buy for an underweight class that `pickBuyCandidate`'s choice would wash
 * (`washingSymbols`): the model's own implementation security for the class first, then what the
 * account already holds in it, skipping every washing symbol. "Substantially identical" is the
 * same symbol here, as throughout `wash-sale.ts`. A model security the account holds is bought as
 * the holding, at the holding's price.
 */
function substituteBuyCandidate(
  held: readonly Position[],
  modelId: string,
  assetClass: string,
  currency: CurrencyCode,
  washing: ReadonlySet<string>,
): TradeCandidate | undefined {
  const holdings = held.map((position): TradeCandidate => ({ symbol: position.symbol, name: position.name, price: position.price, position }))
  const security = modelImplementationSecurity(modelId, assetClass)
  const modelCandidate = security && (holdings.find((c) => c.symbol === security.symbol) ?? {
    symbol: security.symbol,
    name: security.name,
    price: convertCurrency(security.price, 'USD', currency, FX_RATES_USD_BASE),
  })
  return [modelCandidate, ...holdings].find((c): c is TradeCandidate => c !== undefined && !washing.has(c.symbol))
}

/**
 * `taxImpact: taxAware ? 3_800 : 0` made the riskier setting
 * display as free. Tax is estimated per-lot from the account's actual embedded gains at the
 * lot's own holding-period rate, so a tax-unaware rebalance realizes MORE than a tax-aware one,
 * never zero — and a Roth IRA or traditional IRA (`isTaxableAccount`) shows zero, always.
 *
 * Trades come from the account's own drift (`computeDriftForAccount`, the same function the
 * drift surface reads) filtered by the caller's own `driftThreshold` (the Rebalance page's
 * control), not a hardcoded 0.005. `d.actual > d.target` is what tells an overweight asset class
 * (sell) from an underweight one (buy). `d.drift` is **signed** (negative = underweight),
 * so both the threshold test and the notional take `Math.abs` — comparing the raw value against a
 * positive threshold would silently drop every underweight class, leaving an all-sell proposal.
 *
 * Self-financing applies to the **sell** side only, and only to avoid stranding
 * proceeds that have nowhere to go: `sellScale` caps sells at what the buy side can actually
 * absorb, which correctly falls to **zero** — propose nothing — when there is nothing at all to
 * absorb them (an earlier `totalBuy > 0 &&` guard left this branch unscaled instead, which read
 * as a short sale in a long-only demo on the account's proxy holding for an asset class it's
 * overweight but can't rebalance out of). Buys are **never** capped: an account draws on its own
 * cash reserve to fund a purchase, exactly as it always could — capping buys to match sells
 * (an earlier `buyScale`) needlessly shrank purchases an account had ample cash to make outright,
 * leaving both the overweight-cash and the underweight-target gaps uncorrected.
 *
 * Proceeds have a second home the sell cap above ignored: **cash itself**. `cash` is
 * an asset class in the model with its own target weight, but it never yields a tradeable
 * candidate (the `p.symbol !== 'CASH'` filter below), so it could never contribute to
 * `totalBuy`. Capping sells at `totalBuy` alone therefore stranded every account whose only
 * underweight classes were ones it doesn't hold plus cash: acc-030 and acc-037 (2.0% cash
 * against a 5% target) and acc-014 and acc-032 (2.0% against 10%) proposed nothing at all, or
 * next to nothing, despite holding overweight positions comfortably inside their market value
 * that an advisor could legitimately trim. The symmetric truth to "an account can draw its own
 * cash to fund a buy" is "an account can absorb proceeds into cash, up to its cash target":
 *
 *     end cash = cash − totalBuy + totalSell  ≤  cashTarget x totalValue
 *  ⇒  totalSell ≤ totalBuy + (cashTargetWeight − cashActualWeight) x totalValue
 *
 * so the cap is `totalBuy + cashHeadroom`, with `cashHeadroom` floored at zero — an account
 * already **overweight** cash (acc-041, acc-044, acc-045, acc-047) has nowhere to put proceeds
 * and still correctly proposes nothing, which for three of them is the alternative to a short
 * sale.
 *
 * A sell also never exceeds the position actually held (`Math.min(rawNotional,
 * target.marketValue)`) — long-only, no short sales, even before self-financing scaling: the
 * asset-class drift can imply selling more than any one proxy position is worth.
 */
export function generateRebalanceTrades(
  accountId: string,
  taxAware: boolean,
  driftThreshold = 0.005,
  modelId?: string,
): ProposedTradeLeg[] {
  return generateRebalanceProposal(accountId, taxAware, driftThreshold, modelId).legs
}

/** One account's proposal, as a batch step needs it. */
export type RebalanceProposal = {
  legs: ProposedTradeLeg[]
  /** What each sell leg disposes of, lot by lot, for `settleBatchWashSales`. */
  sales: ReadonlyMap<ProposedTradeLeg, LegSale>
  /** Asset classes a constraint held away from target, with the constraint that did it. */
  heldBack: ReadonlyMap<AssetClass, ResidualDriftReason>
}

/** A generated proposal, with the harvests it kept open by buying a substitute. */
export type GeneratedProposal = RebalanceProposal & { harvestSubstitutions: HarvestSubstitution[] }

/** The substitutions the trades actually carry: the substitute is bought and, if a loss was harvested, the flagged security is sold. */
export function standingHarvestSubstitutions(
  substitutions: readonly HarvestSubstitution[],
  trades: readonly { side: 'buy' | 'sell'; symbol: string }[],
): HarvestSubstitution[] {
  const traded = (side: 'buy' | 'sell', symbol: string) => trades.some((t) => t.side === side && t.symbol === symbol)
  return substitutions.filter((s) => traded('buy', s.bought.symbol) && (!s.harvested || traded('sell', s.foreclosed.symbol)))
}

/** Constraints a proposal is generated under. All optional; `{}` is the unconstrained generator. */
export type GenerationConstraints = {
  /** Sell only loss lots. Tax-advantaged accounts have no loss to harvest and sell nothing. */
  harvestOnly?: boolean
  /** Upper bound on realized gains (gain legs only, losses not netted), in the account's currency. */
  capRealizedGains?: number
  /** Asset classes the proposal leaves untouched. */
  excludeAssetClasses?: readonly AssetClass[]
  /** Never buy a symbol whose purchase would wash a loss of the same wash-sale taxpayer. */
  avoidSelfWash?: boolean
  /**
   * Securities the Harvest Scanner flags for the account's wash-sale taxpayer. A buy of one would
   * foreclose its harvest (a sale of its loss lots within thirty days would be washed), so the buy
   * moves to a non-identical substitute in the class where one exists, and a loss held here is harvested.
   */
  protectHarvests?: ReadonlySet<string>
}

type RealizedResult = Pick<ProposedTrade, 'realizedShortTerm' | 'realizedLongTerm'>

const legGain = (l: RealizedResult) => Math.max(0, l.realizedShortTerm) + Math.max(0, l.realizedLongTerm)

/**
 * Gains realized by these legs, gain legs only: Σ max(0, short-term) + max(0, long-term). Losses
 * are not netted, so the figure ties to the tax tape's "Gains realized".
 */
export function realizedGains(legs: readonly RealizedResult[]): number {
  return legs.reduce((s, l) => s + legGain(l), 0)
}

/**
 * IRC §1091 · the symbols a purchase must not be: every symbol with an open loss-sale window of the
 * account's wash-sale taxpayer (owner and spouse, their IRAs and Roths included —
 * `openWashSaleWindowsFor`), and every symbol this proposal itself sells at a loss. A coin held
 * directly is outside §1091 and is never on the list.
 */
export function washingSymbols(openWindows: readonly { symbol: string }[], lossSoldSymbols: readonly string[]): Set<string> {
  return new Set([...openWindows.map((w) => w.symbol), ...lossSoldSymbols].filter(isSubjectToWashSale))
}

/** Market value of `position`'s lots that stand at a loss: all a harvest of it may sell. */
function lossLotValue(lots: readonly CustodianLot[], position: Position): number {
  return lots.filter((l) => l.positionId === position.id && l.gainLoss < 0).reduce((s, l) => s + l.currentValue, 0)
}

/** How many times the gain cap may re-cut the top gain leg before the engine refuses (each pass is a full cash-band resolution). */
const MAX_GAIN_CAP_PASSES = 32

/**
 * The largest whole-dollar sale, at most `ceiling`, whose realized gains stay at or under
 * `allowedGain`. Found by bisection: in the tax-aware lot order a sale's gains only grow with its
 * size (losses are drawn first), and the lower bound always satisfies the limit, so the answer
 * does even where an oldest-first order makes the growth uneven.
 */
function largestSaleWithin(realize: (value: number) => RealizedResult, ceiling: number, allowedGain: number): number {
  let lo = 0
  let hi = Math.floor(ceiling)
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (legGain(realize(mid)) <= allowedGain) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * `generateRebalanceTrades` with the lots each leg sells. A preview passes the batch's proposals
 * through `settleBatchWashSales`, which needs them; the legs are the same either way.
 *
 * `constraints` narrow what the proposal may do, and every class a constraint holds away
 * from target is named in `heldBack` with the constraint that did it:
 * - `harvestOnly` sells only lots standing at a loss, and keeps the buys those sales and the cash
 *   above target can fund. A tax-advantaged account has no loss to harvest and sells nothing.
 * - `capRealizedGains` trims the gain leg with the most gain per dollar first until the proposal's
 *   realized gains (losses not netted) are at or under the cap.
 * - `excludeAssetClasses` leaves those classes untouched.
 * - `avoidSelfWash` never proposes a buy that would wash one of the proposal's own loss sales or an
 *   open loss sale of the same wash-sale taxpayer in any of their accounts. It buys a substitute
 *   in the class (`substituteBuyCandidate`), or with none leaves the money in cash; either way no
 *   sale is resized for it.
 */
export function generateRebalanceProposal(
  accountId: string,
  taxAware: boolean,
  driftThreshold = 0.005,
  modelId?: string,
  constraints: GenerationConstraints = {},
): GeneratedProposal {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return { legs: [], sales: new Map(), heldBack: new Map(), harvestSubstitutions: [] }
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account, modelIdFor(account, modelId))
  const taxable = isTaxableAccount(account.taxTreatment)
  const currency = currencyForAccount(accountId)
  const lossWindows = openWashSaleWindowsFor(account, MOCK_TODAY_ISO)
  // The account's own lots are generated once and shared by the sell ordering, every leg's
  // `realizeSale`, and the taxpayer's acquisitions below.
  const ownLots = generateTaxLots(account.id, account.totalValue)
  const recentlyOpened = recentlyOpenedPositions(ownLots, MOCK_TODAY_ISO)
  const acquisitions = washSaleAcquisitions(account, (a) => (a.id === account.id ? ownLots : generateTaxLots(a.id, a.totalValue)))
  const harvestOnly = constraints.harvestOnly === true
  // A harvest is tax-aware whatever the toggle says: it sells the deepest losses first, never a
  // replacement still inside its hold, and only the loss lots themselves (specific
  // identification), so no rounding of the share count can reach into a gain lot.
  const sellTaxAware = taxAware || harvestOnly
  const saleLots = harvestOnly ? ownLots.filter((l) => l.gainLoss < 0) : ownLots
  const saleOf = (position: Position, value: number) => realizeSale(saleLots, position, value, sellTaxAware)
  const excluded = new Set<AssetClass>(constraints.excludeAssetClasses ?? [])
  const heldBack = new Map<AssetClass, ResidualDriftReason>()
  const lossValueOf = (p: Position) => lossLotValue(ownLots, p)

  /**
   * A buy `avoidSelfWash` turned away from its washing `target` is still resolved onto the cash
   * band as that target, so no sale (above all no harvest) is resized for the constraint:
   * - `substitute`: then bought instead, for the value the band sized, in whole units of its own;
   * - `parked`: no substitute exists, so it is left out and the money it would have spent stays in cash.
   */
  type RawLeg = { target: TradeCandidate; side: 'buy' | 'sell'; notional: number; sleeve: Sleeve; substitute?: TradeCandidate; parked?: true }

  const drafted = drift.assetClassDrifts
    .filter((d) => Math.abs(d.drift) > driftThreshold)
    .flatMap((d): RawLeg[] => {
      if (excluded.has(d.assetClass)) {
        heldBack.set(d.assetClass, 'excluded_by_constraint')
        return []
      }
      const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
      const side: 'buy' | 'sell' = d.actual > d.target ? 'sell' : 'buy'
      const rawNotional = Math.abs(d.drift) * account.totalValue
      const sleeve: Sleeve = { assetClass: d.assetClass, actualWeight: d.actual, targetWeight: d.target }

      if (side === 'sell') {
        // A sell can only ever come from a position actually held — there is no short side here.
        // Draw candidates in preference order and keep filling until the sleeve's notional is met
        // or the candidates are exhausted; each leg is still capped at its own position's market
        // value (a harvest's at its loss lots' value), so long-only holds leg by leg as well as in
        // aggregate.
        const ordered = orderSellCandidates(held, sellTaxAware && taxable, recentlyOpened)
        const candidates = harvestOnly ? (taxable ? ordered.filter((p) => lossValueOf(p) > 0) : []) : ordered
        let remaining = rawNotional
        const legs: RawLeg[] = []
        for (const position of candidates) {
          if (remaining <= 0) break
          const notional = Math.min(remaining, harvestOnly ? lossValueOf(position) : position.marketValue)
          if (notional <= 0) continue
          legs.push({
            target: { symbol: position.symbol, name: position.name, price: position.price, position },
            side,
            notional,
            sleeve,
          })
          remaining -= notional
        }
        // Held back for the harvest only where it left unsold value the sleeve could have sold: a
        // position with no loss lot, or the gain lots of one it harvested.
        const unconstrainedReach = Math.min(rawNotional, ordered.reduce((s, p) => s + p.marketValue, 0))
        if (harvestOnly && rawNotional - remaining < unconstrainedReach - 1) heldBack.set(d.assetClass, 'harvest_only')
        return legs
      }

      const target = pickBuyCandidate(held, drift.modelId, d.assetClass, currency)
      if (!target) return []
      return [{ target, side, notional: rawNotional, sleeve }]
    })

  // A buy of a security the Harvest Scanner flags for this taxpayer forecloses that harvest.
  // Where the class has a non-identical substitute that is neither flagged nor washing, the substitute
  // is bought instead; a loss this account holds in the flagged security is harvested now, its loss
  // lots only, and its proceeds go to the substitute. With no substitute the buy stands. The rule
  // holds in an IRA or Roth too: its purchase washes the taxpayer's taxable loss and disallows it
  // permanently (Rev. Rul. 2008-5), so it moves to the substitute; only the harvest leg needs a
  // taxable account, since only there does a sale realize a loss.
  const protectedHarvests: ReadonlySet<string> = constraints.protectHarvests ?? new Set<string>()
  const lossSoldIn = (legs: readonly RawLeg[]) => (taxable
    ? legs.filter((l) => l.side === 'sell' && l.target.position && saleOf(l.target.position, l.notional).soldLosses.length > 0).map((l) => l.target.symbol)
    : [])
  const harvestSubstitutions: HarvestSubstitution[] = []
  const withHarvests = drafted.flatMap((leg): RawLeg[] => {
    if (leg.side !== 'buy' || !protectedHarvests.has(leg.target.symbol)) return [leg]
    const held = positions.filter((p) => p.assetClass === leg.sleeve.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
    const avoid = new Set([...protectedHarvests, ...washingSymbols(lossWindows, lossSoldIn(drafted))])
    const substitute = substituteBuyCandidate(held, drift.modelId, leg.sleeve.assetClass, currency, avoid)
    if (!substitute) return [leg]
    const lossHolding = positions.find((p) => p.symbol === leg.target.symbol && isMarketTradable(p.symbol) && lossValueOf(p) > 0)
    const harvest = taxable && lossHolding && !drafted.some((l) => l.side === 'sell' && l.target.symbol === leg.target.symbol) ? lossHolding : undefined
    harvestSubstitutions.push({
      assetClass: leg.sleeve.assetClass, foreclosed: { symbol: leg.target.symbol, name: leg.target.name },
      bought: { symbol: substitute.symbol, name: substitute.name }, harvested: harvest !== undefined,
    })
    if (!harvest) return [{ ...leg, substitute }]
    const notional = lossValueOf(harvest)
    return [
      { target: { symbol: harvest.symbol, name: harvest.name, price: harvest.price, position: harvest }, side: 'sell', notional, sleeve: leg.sleeve },
      { ...leg, notional: leg.notional + notional, substitute },
    ]
  })

  // A buy of a symbol the taxpayer has an open loss window on, or that this proposal sells at a
  // loss, is the replacement purchase §1091 looks for. Only a taxable account's sale realizes a loss.
  const lossSold = lossSoldIn(withHarvests)
  const washing = constraints.avoidSelfWash ? washingSymbols(lossWindows, lossSold) : new Set<string>()
  // A washing buy moves to a substitute in the same class; only a class with none is held back.
  // A buy already moved to a substitute above keeps it.
  const raw = withHarvests.map((leg): RawLeg => {
    if (leg.side !== 'buy' || leg.substitute || !washing.has(leg.target.symbol)) return leg
    const held = positions.filter((p) => p.assetClass === leg.sleeve.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
    const substitute = substituteBuyCandidate(held, drift.modelId, leg.sleeve.assetClass, currency, washing)
    if (substitute) return { ...leg, substitute }
    heldBack.set(leg.sleeve.assetClass, 'wash_sale_avoided')
    return { ...leg, parked: true }
  })

  // The cash band does not depend on the legs, so it is measured once, ahead of every resolution.
  // Cash is a model asset class with its own target, but it never yields a tradeable candidate,
  // so it can only ever absorb proceeds — never generate a buy. The **target** weight is read
  // from the same `computeDriftForAccount` result the trades come from, so the band shown on the
  // drift surface is the band the cap enforces.
  //
  // The **actual** side is deliberately taken in money, from the CASH position itself, not from
  // `cashDrift.actual`. `positions.ts` hand-types each position's `weight` to three decimals and
  // `computeDriftForAccount` renormalizes them, so the cash weight it reports differs from
  // `cashBalance / totalValue` by up to ~0.06 of a point — $4,695 on acc-001, $4,470 on acc-006.
  // While buys were small that slack never bound; once an account may buy the classes it
  // holds nothing in, `buyCapacity` is consumed to the last dollar and the slack lands straight
  // in the post-trade cash balance: acc-001 spent down to 4.943% actual cash against a 5% target,
  // acc-044 to 4.977%, acc-045 to 2.972%, acc-046 to 9.959% — real breaches of the model's own
  // cash floor, sized by a rounding artefact in a display weight. Cash to spend is cash, so it is
  // measured in cash. The CASH position's market value equals `account.cashBalance` for all 47
  // accounts (`cash-cap-invariants` pins it); the fallback covers an account with no CASH row.
  const cashDrift = drift.assetClassDrifts.find((d) => d.assetClass === 'cash')
  const cashValue = positions.find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance
  const cashTargetValue = (cashDrift?.target ?? 0) * account.totalValue
  // Executed money is whole currency units (`estimatedValue` is rounded), so the band is measured
  // in whole units too: floored, a whole-unit trade set cannot step past a target that falls on a
  // fraction. That is reachable: the generated cash balances carry cents, and
  // acc-008 onto mod-005 netted $38,756 into a $38,755.50 gap.
  const cashHeadroom = Math.max(0, Math.floor(cashTargetValue - cashValue))

  // The cash-headroom cap above stops sells pushing cash above target. Nothing stopped
  // uncapped buys pulling it below — acc-043 sold €648,900, bought €909,760, and its cash fell
  // 13.69% -> 5.56% against a 10% target. The mirror bound: buys draw on cash, and an account
  // may not spend below its own cash target to fund them. `buyCapacity` is what sells raise
  // plus the cash genuinely available above target — the `cashAboveTarget` term is what makes
  // this correct where an earlier attempt (`buyScale = totalSell / totalBuy`, capping buys to
  // match sells alone, since reverted) was not: acc-006 legitimately funds buys from its
  // own cash above target — now with no sells at all, since BXPE is periodic-liquidity and never
  // sold — and must continue to.
  //
  // ── Funding priority, stated deliberately ──────────────────────────────────────────────────
  // When proceeds cannot cover both the underweight return-seeking sleeves and an underweight
  // cash target, something has to give, and the answer must be a decision rather than a side
  // effect of ordering. **Cash is funded last: it absorbs whatever the sleeves cannot take, and
  // is never reserved out of proceeds ahead of them.** That is what the `Math.max(0, …)` floor
  // below encodes — an account *below* its cash target contributes 0 to `buyCapacity` (it may
  // not spend cash it does not have above target) but is never made to *withhold* proceeds to
  // top cash up either.
  //
  // Why, and what was rejected:
  //  - A rebalance moves an account's **invested** exposure toward policy; cash is the balancing
  //    item that absorbs what cannot be placed. Reserving cash ahead of the sleeves inverts that
  //    — an account underweight both would shrink its own asset purchases in order to sit in
  //    cash, the opposite of what its model asks for.
  //  - The liquidity floor that genuinely *is* a constraint is enforced elsewhere and separately:
  //    `CASH_MINIMUM_PCT` (2%) hard-blocks a buy in the pre-trade check. A model's cash *target*
  //    is a policy weight, not that floor.
  //  - Pro-rata (split the shortfall across cash and the sleeves) was considered and rejected: it
  //    under-funds every sleeve AND still misses the cash target — worse on both axes than fully
  //    funding what the proceeds can reach.
  //  - Cash remains bounded on both sides regardless: it can rise only to target (`cashHeadroom`)
  //    and fall only to target (`cashAboveTarget`), the two-sided cash invariant.
  // This is not new behavior — it is the choice the floor already made, now named. The existing
  // acc-015 test below ('the floor on cashAboveTarget lets the full $113,820 buy through') is its
  // pin: acc-015 is 0.6 points *under* its cash target and still deploys the full buy.
  const cashAboveTarget = Math.max(0, Math.floor(cashValue - cashTargetValue))

  type Resolved = { legs: ProposedTradeLeg[]; sales: Map<ProposedTradeLeg, LegSale>; rawOf: Map<ProposedTradeLeg, RawLeg> }

  /** Executable legs for `rawLegs`, resolved onto the cash band. */
  const resolve = (rawLegs: readonly RawLeg[]): Resolved => {
    const sales = new Map<ProposedTradeLeg, LegSale>()
    const totalSell = rawLegs.filter((t) => t.side === 'sell').reduce((s, t) => s + t.notional, 0)
    const totalBuy = rawLegs.filter((t) => t.side === 'buy').reduce((s, t) => s + t.notional, 0)

    /**
     * Build one executable leg: scale the notional, convert it to a tradeable lot, and take the
     * value **from the lot** rather than from the notional the lot came from.
     */
    const toTrade = ({ target, side, notional: rawNotional, sleeve }: RawLeg, scale: number): ProposedTradeLeg => {
      const notional = rawNotional * scale
        // `Math.round(notional / price)` rounded a share count **up**, so a sell could name
        // more units than the account owns: acc-045 holds 22.5 ETH and 15,231.5 USDC (fractional
        // crypto), and rounding 22.5 to 23 emitted an order to sell more ETH than exists — a
        // custodian rejection. The value cap (`Math.min(rawNotional, position.marketValue)`) held
        // throughout; only the rounded quantity broke it, which is why a sweep that tolerated a
        // whole share of slack reported clean.
        //
        // `boundedTradeQty` in `custodian.ts` already is this codebase's rounding policy for "how
        // many units may this trade name" — whole units floored and clamped to the cap, sub-unit
        // caps kept to six decimals — and it was written for exactly this fractional-crypto case.
        // Reused rather than restated: a second rounding rule in a second file is the divergence
        // this phase exists to remove. The cap is the shares actually held for a sell, and what the
        // notional affords for a buy (so a buy can never name more units than it pays for either,
        // which `Math.round` also allowed).
        //
        // `estimatedValue` follows from the quantity actually being traded — `quantity x price`,
        // rounded once — rather than from the un-floored notional. The preview renders both on the
        // same row, so a row that does not multiply out is two numbers describing one trade and
        // disagreeing on screen: "buy 15 VTI · $4,275" against 15 x $268.50 = $4,028 is $247 that
        // is not there. Flooring made that systematic (25 of 273 legs were off by more than 0.5%,
        // up to 5.8%) where `Math.round` had been symmetric and cost at most half a share. The
        // notional is what the *drift* asks for; the trade is what can actually be executed, and
        // the row must state the latter.
        const rawQuantity = notional / target.price
        const quantityCap = side === 'sell' && target.position ? target.position.quantity : rawQuantity
        // 0: a sleeve whose notional cannot afford one whole lot trades nothing. The shared
        // function's other caller wants a minimum of one unit; taking that policy here would round
        // a sub-lot notional **up** to a whole lot — one BTC is $87,450 — and breach both the
        // long-only value bound and the cash band. `estimatedValue <= 0` then drops the leg.
        const quantity = boundedTradeQty(quantityCap, rawQuantity, 1, 0)
        const estimatedValue = Math.round(quantity * target.price)
        // Round 4 · the tax follows the **same** figure the row shows, not the notional the lot was
        // derived from. Moving `estimatedValue` onto executed money and leaving `estimatedTax` on
        // the pre-floor notional left the rendered row describing two different trades: acc-045's
        // BTC leg read `quantity 2 · $174,900 · tax $10,231`, where the tax had been estimated on
        // the $187,895 notional — 7.4% more BTC than the row says is being sold, because one BTC
        // unit is half this leg's executed value. 48 taxed legs book-wide were affected; the
        // exposure per leg is bounded by `unitPrice / estimatedValue`. All three numbers on the
        // row now describe one trade.
        const realized = side === 'sell' && taxable && target.position
          ? saleOf(target.position, estimatedValue)
          : NOTHING_REALIZED
        const trade: ProposedTradeLeg = {
          symbol: target.symbol,
          name: target.name,
          side,
          quantity,
          estimatedValue,
          taxImpact: realized.tax,
          realizedShortTerm: realized.shortTerm,
          realizedLongTerm: realized.longTerm,
          realizedCollectibleLongTerm: realized.collectibleLongTerm,
          washSaleRisk: hasWashSaleRisk(
            { symbol: target.symbol, side, realizesLoss: realized.shortTerm + realized.longTerm < 0, soldLotIds: realized.consumedLotIds },
            lossWindows, acquisitions, MOCK_TODAY_ISO,
          ),
          currency,
          ...sleeve,
        }
        sales.set(trade, { soldLosses: realized.soldLosses, consumedLotIds: realized.consumedLotIds, lotTakes: takesForQuantity(realized.lotTakes, quantity, target.price) })
        return trade
    }

    // Build one side of the proposal at a given scale and report the money it **actually** moves —
    // the sum of the executed leg values, not of the un-floored notionals they came from. That
    // figure is what both cash caps below are sized against.
    const built = new Map<RawLeg, ProposedTradeLeg>()
    const build = (side: 'buy' | 'sell', scale: number): number => {
      let executed = 0
      for (const leg of rawLegs) {
        if (leg.side !== side) continue
        const trade = toTrade(leg, scale)
        // `delete`, not `continue`: a side can be rebuilt at a smaller scale (see the convergence
        // loop below), and a leg that no longer affords a whole lot must leave the proposal rather
        // than linger at the value the previous pass gave it.
        if (trade.estimatedValue <= 0) { built.delete(leg); continue }
        built.set(leg, trade)
        executed += trade.estimatedValue
      }
      return executed
    }

    // The two caps are two halves of one statement about the money the proposal moves
    // into cash. With `endCash = cashValue − executedBuy + executedSell` required to lie between
    // where the account started and its own model cash target:
    //
    //     −cashAboveTarget  ≤  executedSell − executedBuy  ≤  cashHeadroom
    //
    // One bound is the target the account is moving toward; the other is where it started. **Both
    // are real, and both must be measured on executed money** — a correction once
    // applied to only one of them. That version made the *binding* cap on each branch read the executed
    // total and left the *non*-binding one reading the pre-floor total, on the argument that the
    // starting bound "sits far from either result". That argument is false for a thinly-drifted
    // account: acc-033 is only 0.88 of a point overweight cash, its sell cap read the pre-floor
    // `totalBuy` of 4,134 while the buy leg floored to 4,039 and the sell executed 4,115, and the
    // account finished **more** overweight cash than it started — 5.8894% against 5.8796%, $76 the
    // wrong way past its own starting balance. Neither whole-book cash sweep saw it, because both
    // were stated as a weight tolerance ($156 on acc-033, $2,500 on acc-041) rather than in money.
    //
    // Each cap is written **once**, and each reads the other side's executed figure:
    const buyScaleFor = (executedSell: number) =>
      totalBuy > 0 ? Math.min(1, (executedSell + cashAboveTarget) / totalBuy) : 1
    const sellScaleFor = (executedBuy: number) =>
      totalSell > 0 ? Math.min(1, (executedBuy + cashHeadroom) / totalSell) : 1

    // Which side is built first is still not arbitrary: **the binding cap's side is built second**,
    // so the first pass already has the binding bound measured on executed money.
    //
    //  - Overweight cash (`cashAboveTarget > 0`): the model's cash *target* is the floor the account
    //    is falling toward, so the binding cap is the buy cap — buys may not spend past what sells
    //    raise plus the surplus. Sells first, buys against `executedSell`. Reading the pre-floor
    //    `totalSell` there let acc-045 buy $411,894 against $370,372 genuinely raised (BTC alone
    //    floors 2.1487 units to 2, dropping $13,003) and drove its cash to **−0.39%** — a proposal
    //    the account cannot pay for.
    //  - Underweight cash (`cashHeadroom > 0`): the target is the ceiling the account is rising
    //    toward, so the binding cap is the sell cap — proceeds may not exceed what buys absorb plus
    //    the gap to target. Buys first, sells against `executedBuy`. Reading the pre-floor
    //    `totalBuy` there pushed seven accounts past their cash target by $58–$205 apiece.
    //
    // The two caps each read the other side's executed figure, so they are resolved by iterating
    // rather than in one shot. Two distinct stopping conditions, and the difference between them is
    // the point:
    //
    //  - **The band holds.** Done — this is the answer, and it is what every account reaches on the
    //    first or second pass when it is measured against its own model.
    //  - **The pair stops moving.** A fixed point `b = B(s), s = S(b)`. See the caveat on this one
    //    below — it is very nearly, but not exactly, a proof that the band holds.
    //
    // The previous form ran a fixed **four** passes and then simply returned whatever it
    // held, band or no band. That was sound while the only reachable inputs were each account
    // against its own model — but the model-trade screen previews an account against *any* model,
    // and acc-045 onto mod-003 (or mod-006) converges too slowly for four passes: the gap closed
    // 12,088 -> 6,870 -> 2,142 -> 436 and the function returned the $436 breach.
    //
    // Every pass strictly shrinks both sides (a cap re-read on an executed total is never larger
    // than the same cap read on the pre-floor total it replaces) and both are non-negative integer
    // sums, so the iteration is a decreasing integer sequence bounded below and the fixed-point
    // break must eventually fire. **But that bound is `executedSell₀ + executedBuy₀` — hundreds of
    // thousands — not `MAX_PASSES`.** `MAX_PASSES` is a heuristic cutoff, and the whole lesson of
    // the `4` it replaced is that a cutoff which returns a plausible-looking wrong answer is worse
    // than one that fails. So the band is **asserted** after the loop rather than assumed. A demo
    // that errors is honest; a demo that proposes a trade set the account cannot fund is the defect
    // class this phase exists to remove. Review of this task constructed the case: across ~28,000
    // synthetic account/model pairs, 7 exhausted a 32-pass loop and returned real breaches, the
    // worst $5,412 below the account's own starting cash.
    //
    // Two known-inexact edges the post-loop assertion also backstops, neither reachable in the
    // fixtures — it is the assertion, not the argument, that makes them safe:
    //  - The fixed-point argument (`B(s) ≤ s + cashAboveTarget`) holds for the **notional** a side
    //    is scaled to, not for its executed total: `estimatedValue` is `Math.round(quantity ×
    //    price)`, which can round *up* by up to $0.50 per leg. Two constructed cases exit on the
    //    fixed-point condition with $0.39 and $0.26 breaches.
    //  - `MAX_PASSES` is measured, not derived. Over the whole reachable configuration space —
    //    47 accounts x 7 models x 2 tax modes x 11 drift thresholds = 7,238 — 7,194 settle on the
    //    first or second pass and the slowest is acc-045 onto mod-006 at a 0.10 threshold, settling
    //    on the **tenth** (acc-045 onto mod-003 at 0.05 settles on the ninth). Every one settles on
    //    the band: none on the fixed-point condition, none exhausted.
    //    `model-trade-invariants` sweeps that whole space for the band in money at zero tolerance,
    //    so a regression that pushes any configuration past the cutoff fails loudly rather than
    //    quietly returning a proposal nobody bounded.
    const withinCashBand = (executedSell: number, executedBuy: number) =>
      executedSell - executedBuy <= cashHeadroom && executedBuy - executedSell <= cashAboveTarget
    const sellsFirst = cashAboveTarget > 0
    const MAX_PASSES = 32
    let executedSell = 0
    let executedBuy = 0
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const priorSell = executedSell
      const priorBuy = executedBuy
      if (sellsFirst) {
        executedSell = build('sell', sellScaleFor(pass === 0 ? totalBuy : executedBuy))
        executedBuy = build('buy', buyScaleFor(executedSell))
      } else {
        executedBuy = build('buy', buyScaleFor(pass === 0 ? totalSell : executedSell))
        executedSell = build('sell', sellScaleFor(executedBuy))
      }
      if (withinCashBand(executedSell, executedBuy)) break
      if (pass > 0 && executedSell === priorSell && executedBuy === priorBuy) break
    }
    if (!withinCashBand(executedSell, executedBuy)) {
      throw new Error(
        `rebalance cap resolution did not reach the cash band for ${account.id} on ${drift.modelId}: `
        + `sold ${executedSell}, bought ${executedBuy}, headroom ${Math.round(cashHeadroom)}, `
        + `surplus ${Math.round(cashAboveTarget)} — refusing to propose trades the account cannot fund`,
      )
    }

    // A buy turned away from a washing symbol was sized as that symbol; it now becomes its
    // substitute, at no more than the value sized (whole units floored), or leaves the proposal.
    for (const leg of rawLegs) {
      const sized = built.get(leg)
      if (!sized || (!leg.parked && !leg.substitute)) continue
      sales.delete(sized)
      const bought = leg.substitute && toTrade({ ...leg, target: leg.substitute, notional: sized.estimatedValue }, 1)
      if (bought && bought.estimatedValue > 0) {
        built.set(leg, bought)
        continue
      }
      if (bought) sales.delete(bought)
      built.delete(leg)
      heldBack.set(leg.sleeve.assetClass, 'wash_sale_avoided')
    }

    // Emitted in the drift surface's own asset-class order, so a preview reads the same way it did
    // before sells and buys were built in separate passes.
    const legs = rawLegs.map((leg) => built.get(leg)).filter((t): t is ProposedTradeLeg => t !== undefined)
    return { legs, sales, rawOf: new Map([...built].map(([rawLeg, trade]) => [trade, rawLeg])) }
  }

  let current: readonly RawLeg[] = raw
  let resolved = resolve(current)
  const cap = constraints.capRealizedGains
  if (cap !== undefined) {
    // Trim the gain leg with the most gain per dollar first, re-resolving the cash band each pass:
    // the gains realized last are the ones a cap gives up first. Each trim keeps the largest sale
    // of that leg still inside the cap, so a leg that harvests losses before its gains keeps the
    // harvest. Trimming one sale can let the band scale the others back up, hence the passes.
    for (let pass = 0; pass < MAX_GAIN_CAP_PASSES && realizedGains(resolved.legs) > cap; pass++) {
      const top = resolved.legs
        .filter((l) => l.side === 'sell' && legGain(l) > 0)
        .sort((a, b) => legGain(b) / b.estimatedValue - legGain(a) / a.estimatedValue)[0]
      const source = top === undefined ? undefined : resolved.rawOf.get(top)
      const position = source?.target.position
      if (!top || !source || !position) break
      heldBack.set(source.sleeve.assetClass, 'gains_capped')
      const allowedGain = Math.max(0, legGain(top) - (realizedGains(resolved.legs) - cap))
      const realize = (value: number): RealizedResult => {
        const sale = saleOf(position, value)
        return { realizedShortTerm: sale.shortTerm, realizedLongTerm: sale.longTerm }
      }
      const notional = largestSaleWithin(realize, top.estimatedValue, allowedGain)
      current = current.flatMap((leg) => (leg !== source ? [leg] : notional > 0 ? [{ ...leg, notional }] : []))
      resolved = resolve(current)
    }
    if (realizedGains(resolved.legs) > cap) {
      throw new Error(`gain cap resolution did not reach ${cap} for ${account.id}: refusing to propose gains past the cap`)
    }
  }
  return {
    legs: resolved.legs, sales: resolved.sales, heldBack,
    harvestSubstitutions: standingHarvestSubstitutions(harvestSubstitutions, resolved.legs),
  }
}

/**
 * The account's holdings after `legs` execute: a sell reduces its position, a buy adds to
 * its position (or opens one), and cash takes the difference. Weights stay `marketValue /
 * totalValue`, the definition `getPositionsForAccount` uses, because trades move money between
 * holdings without changing the account's value.
 */
export function holdingsAfterTrades(account: (typeof accounts)[number], positions: readonly Position[], legs: readonly ProposedTradeLeg[]): DriftHolding[] {
  const bySymbol = new Map(positions.map((p) => [p.symbol, { assetClass: p.assetClass, marketValue: p.marketValue }]))
  let cashMoved = 0
  for (const leg of legs) {
    const signed = leg.side === 'sell' ? -leg.estimatedValue : leg.estimatedValue
    const held = bySymbol.get(leg.symbol)
    bySymbol.set(leg.symbol, { assetClass: held?.assetClass ?? leg.assetClass, marketValue: (held?.marketValue ?? 0) + signed })
    cashMoved -= signed
  }
  const cash = bySymbol.get('CASH')
  bySymbol.set('CASH', { assetClass: 'cash', marketValue: (cash?.marketValue ?? 0) + cashMoved })
  return [...bySymbol.values()].map(({ assetClass, marketValue }) => ({ assetClass, weight: marketValue / account.totalValue }))
}

export type LegCut = { quantity: number; lotIds?: readonly string[] }
export type RecutFailure = {
  ok: false
  code: 'BAD_QUANTITY' | 'OVER_HELD' | 'LOT_NOT_IN_POSITION' | 'DUPLICATE_LOT' | 'LOTS_TOO_SMALL' | 'LOTS_ON_BUY'
  message: string
}

/** The settled §1091 fields belong to a batch; a re-cut leg is settled again with the rest of its batch. */
const unsettled = ({ washedLoss: _washed, repurchaseBlockedUntil: _until, ...leg }: ProposedTradeLeg): ProposedTradeLeg => leg

/** What one unit of a leg's security costs in the account's currency: the held position's price, or the symbol's own quote. */
function unitPriceFor(account: Account, leg: ProposedTradeLeg, position: Position | undefined): number {
  if (position) return position.price
  const quote = usdQuoteFor(leg.symbol)
  if (!quote) throw new Error(`recutLeg: no quote for ${leg.symbol} in ${account.id}`)
  return convertCurrency(quote.price, 'USD', currencyForAccount(account.id), FX_RATES_USD_BASE)
}

/** Whether a holding trades in fractions: a directly held coin does, and so does any position already held in a fraction. */
const tradesInFractions = (symbol: string, position: Position | undefined) =>
  SPOT_CRYPTO_SYMBOLS.has(symbol) || (position !== undefined && !Number.isInteger(position.quantity))

/**
 * A workbench edit re-cut onto one leg. A sale is re-realized lot by lot: from `lotIds`
 * in the order given (specific identification) or, without them, in the generator's own tax-aware
 * order. A purchase is re-priced. The engine refuses what cannot be traded rather than clamping it.
 *
 * For tax-aware proposals only: a sale without chosen lots is drawn in the tax-aware lot order,
 * never a tax-unaware proposal's oldest-first order.
 */
export function recutLeg(accountId: string, leg: ProposedTradeLeg, { quantity, lotIds }: LegCut): { ok: true; leg: ProposedTradeLeg; sale: LegSale } | RecutFailure {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`recutLeg: unknown account ${accountId}`)
  const position = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === leg.symbol && p.symbol !== 'CASH')
  const wholeUnits = !tradesInFractions(leg.symbol, position)
  if (!Number.isFinite(quantity) || quantity <= 0 || (wholeUnits && !Number.isInteger(quantity))) {
    return { ok: false, code: 'BAD_QUANTITY', message: `${leg.symbol}: the quantity must be a positive ${wholeUnits ? 'whole number of shares' : 'number of units'}.` }
  }
  const taxable = isTaxableAccount(account.taxTreatment)
  const ownLots = generateTaxLots(account.id, account.totalValue)
  const lossWindows = openWashSaleWindowsFor(account, MOCK_TODAY_ISO)
  const acquisitions = washSaleAcquisitions(account, (a) => (a.id === account.id ? ownLots : generateTaxLots(a.id, a.totalValue)))

  if (leg.side === 'buy') {
    if (lotIds) return { ok: false, code: 'LOTS_ON_BUY', message: `${leg.symbol}: lots are chosen for a sale, not a purchase.` }
    const estimatedValue = Math.round(quantity * unitPriceFor(account, leg, position))
    const washSaleRisk = hasWashSaleRisk({ symbol: leg.symbol, side: 'buy', realizesLoss: false, soldLotIds: [] }, lossWindows, acquisitions, MOCK_TODAY_ISO)
    return { ok: true, leg: { ...unsettled(leg), quantity, estimatedValue, washSaleRisk }, sale: { soldLosses: [], consumedLotIds: [], lotTakes: [] } }
  }

  if (!position) throw new Error(`recutLeg: ${accountId} sells ${leg.symbol} but holds none`)
  if (quantity > position.quantity) return { ok: false, code: 'OVER_HELD', message: `${leg.symbol}: the account holds fewer shares than that.` }
  const positionLots = ownLots.filter((l) => l.positionId === position.id)
  let ordered: CustodianLot[]
  if (lotIds) {
    const byId = new Map(positionLots.map((l) => [l.id, l]))
    const duplicate = lotIds.find((id, i) => lotIds.indexOf(id) !== i)
    if (duplicate !== undefined) return { ok: false, code: 'DUPLICATE_LOT', message: `${leg.symbol}: lot ${duplicate} is chosen more than once.` }
    const missing = lotIds.find((id) => !byId.has(id))
    if (missing !== undefined) return { ok: false, code: 'LOT_NOT_IN_POSITION', message: `${leg.symbol}: lot ${missing} is not part of this position.` }
    ordered = lotIds.flatMap((id) => byId.get(id) ?? [])
    const inLots = ordered.reduce((s, l) => s + l.quantity, 0)
    if (inLots + 1e-9 < quantity) return { ok: false, code: 'LOTS_TOO_SMALL', message: `${leg.symbol}: the chosen lots hold fewer shares than the sale.` }
  } else {
    ordered = taxable ? taxAwareLotOrder(positionLots, position.symbol) : positionLots
  }
  const estimatedValue = Math.round(quantity * position.price)
  const realized = taxable ? realizeOrderedLots(ordered, position.symbol, estimatedValue) : NOTHING_REALIZED
  const trade: ProposedTradeLeg = {
    ...unsettled(leg),
    quantity,
    estimatedValue,
    taxImpact: realized.tax,
    realizedShortTerm: realized.shortTerm,
    realizedLongTerm: realized.longTerm,
    realizedCollectibleLongTerm: realized.collectibleLongTerm,
    washSaleRisk: hasWashSaleRisk(
      { symbol: leg.symbol, side: 'sell', realizesLoss: realized.shortTerm + realized.longTerm < 0, soldLotIds: realized.consumedLotIds },
      lossWindows, acquisitions, MOCK_TODAY_ISO,
    ),
  }
  return { ok: true, leg: trade, sale: { soldLosses: realized.soldLosses, consumedLotIds: realized.consumedLotIds, lotTakes: takesForQuantity(realized.lotTakes, quantity, position.price) } }
}

/** What the classifier needs to know about one invested asset class still away from target. */
export type ResidualFacts = {
  /** Projected drift, signed (positive = overweight). */
  drift: number
  totalValue: number
  /** Value left after the trades in positions a sell could still draw on. */
  sellableLeft: number
  /** Value in positions with no market to sell into (`isMarketTradable` false). */
  nonTradableLeft: number
  /** Value in harvest replacements a tax-aware rebalance holds for `REPLACEMENT_HOLD_DAYS`. */
  replacementHeldLeft: number
  /** Price of one unit of the cheapest security that could close the gap; `undefined` when none can. */
  unitPrice: number | undefined
}

/**
 * Why a class is still away from target after the trades. An overweight class whose remaining
 * excess is more than the sellable value left is blocked by what cannot be sold: a periodic-
 * liquidity fund, or a harvest replacement still inside its hold. Otherwise the gap is smaller
 * than one unit of what would close it, or the proposal stopped where the cash band let it.
 */
export function residualReason(facts: ResidualFacts): ResidualDriftReason {
  const residualValue = Math.abs(facts.drift) * facts.totalValue
  if (facts.drift > 0 && facts.sellableLeft < residualValue) {
    if (facts.nonTradableLeft > 0) return 'not_market_tradable'
    if (facts.replacementHeldLeft > 0) return 'replacement_hold'
  }
  if (facts.unitPrice !== undefined && residualValue < facts.unitPrice) return 'below_lot_size'
  return 'cash_capped'
}

/**
 * Drift after the proposed trades, by asset class, from `computeDriftForHoldings` — the
 * function current drift comes from — run on `holdingsAfterTrades`. Every invested class whose
 * |drift| still exceeds `driftThreshold` (the threshold the trades were generated against) carries
 * the reason the proposal could not close it. Cash carries none: it is the balancing item the
 * other classes settle into (see the funding priority in `generateRebalanceTrades`). A class a
 * proposal constraint held back (`constrainedBy`, the proposal's `heldBack`) names that constraint.
 */
export function projectDrift(
  accountId: string,
  legs: readonly ProposedTradeLeg[],
  taxAware: boolean,
  driftThreshold = 0.005,
  modelId?: string,
  constrainedBy: ReadonlyMap<AssetClass, ResidualDriftReason> = new Map(),
): ProjectedDrift {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`projectDrift: unknown account ${accountId}`)
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const after = computeDriftForHoldings(account, holdingsAfterTrades(account, positions, legs), modelIdFor(account, modelId))
  const heldBack = taxAware && isTaxableAccount(account.taxTreatment)
    ? recentlyOpenedPositions(generateTaxLots(account.id, account.totalValue), MOCK_TODAY_ISO)
    : new Set<string>()
  const soldBySymbol = new Map<string, number>()
  for (const leg of legs) if (leg.side === 'sell') soldBySymbol.set(leg.symbol, (soldBySymbol.get(leg.symbol) ?? 0) + leg.estimatedValue)
  const valueLeft = (p: Position) => p.marketValue - (soldBySymbol.get(p.symbol) ?? 0)

  const factsFor = (assetClass: DriftHolding['assetClass'], drift: number): ResidualFacts => {
    const inClass = positions.filter((p) => p.assetClass === assetClass && p.symbol !== 'CASH')
    const sellable = inClass.filter((p) => isMarketTradable(p.symbol) && !heldBack.has(p.id) && valueLeft(p) > 0)
    const sum = (ps: readonly Position[]) => ps.reduce((s, p) => s + valueLeft(p), 0)
    const buyCandidate = drift < 0
      ? pickBuyCandidate(inClass.filter((p) => isMarketTradable(p.symbol)), after.modelId, assetClass, currencyForAccount(accountId))
      : undefined
    const sellPrices = sellable.map((p) => p.price)
    return {
      drift,
      totalValue: account.totalValue,
      sellableLeft: sum(sellable),
      nonTradableLeft: sum(inClass.filter((p) => !isMarketTradable(p.symbol))),
      replacementHeldLeft: sum(inClass.filter((p) => heldBack.has(p.id))),
      unitPrice: drift < 0 ? buyCandidate?.price : (sellPrices.length > 0 ? Math.min(...sellPrices) : undefined),
    }
  }

  // A buy parked to avoid a wash sale leaves its money in cash, so cash ends above target and no
  // class is held to the model's cash target: what holds the rest back is the parked buy.
  const parkedForWash = [...constrainedBy.values()].includes('wash_sale_avoided')
  const constrainedReason = (reason: ResidualDriftReason): ResidualDriftReason =>
    (reason === 'cash_capped' && parkedForWash ? 'wash_sale_avoided' : reason)

  return {
    driftTolerance: after.driftTolerance,
    driftThreshold,
    totalDrift: after.totalDrift,
    maxAbsDrift: after.maxAbsDrift,
    withinBand: !after.needsRebalance,
    assetClassDrifts: after.assetClassDrifts.map((d) => (
      d.assetClass !== 'cash' && Math.abs(d.drift) > driftThreshold
        ? { ...d, residualReason: constrainedBy.get(d.assetClass) ?? constrainedReason(residualReason(factsFor(d.assetClass, d.drift))) }
        : { ...d }
    )),
  }
}

/** One account's entry in a preview batch. */
/** `modelId` names the model the proposal was generated against when it is not the account's own. */
export type PreviewEntry = { account: Account; modelId?: string } & RebalanceProposal

/**
 * The rebalance previews of a batch: §1091 settled across each wash-sale taxpayer's accounts, the
 * tax each proposal adds to its return netted against that return's year-to-date results (and
 * earlier accounts in the batch), the repurchase restrictions, and the drift after the trades. The
 * one assembly behind `/api/oms/rebalance` and every proposal version.
 */
export function buildRebalancePreviews(
  proposed: readonly PreviewEntry[],
  taxAware: boolean,
  driftThreshold: number | undefined,
  asOfISO: string,
): RebalancePreview[] {
  // §1091 across the batch: a buy here can wash a loss sold there, for one taxpayer.
  const settled = settleBatchWashSales(proposed, asOfISO)
  const batch = proposed.map(({ account }, i) => ({ account, legs: settled[i]! }))
  const estimates = estimateTaxOnReturns(batch, asOfISO)
  const proposals = batch.map(({ account, legs }) => ({ accountId: account.id, legs }))
  return batch.map(({ account, legs: trades }, i) => {
    const tax = estimates[i]!
    return {
      accountId: account.id,
      // Same source as every trade on this preview (`currencyForAccount`), so a preview
      // with zero proposed trades still carries a correct currency tag rather than an implicit
      // USD default.
      currency: currencyForAccount(account.id),
      trades,
      // §1222 — the tax this proposal adds to its owner's return, netted with that return's
      // year-to-date results and earlier accounts in this batch on the same return. The gross
      // figure is the legs' own tax on gains, nothing netted: a reference beside the estimate,
      // not a bound on it (see `RebalancePreview.estimatedTaxImpact`).
      estimatedTaxImpact: tax.net,
      grossTaxOnGains: tax.gross,
      ytdRealizedOnReturn: tax.ytdRealizedOnReturn,
      nettedWithAccountIds: tax.nettedWithAccountIds,
      // Whether a sale here is a taxable event at all; a surface reads it to tell "not taxed in
      // this account" from "taxed, and the result is zero".
      taxable: isTaxableAccount(account.taxTreatment),
      repurchaseRestrictions: repurchaseRestrictionsFor(account, asOfISO, proposals),
      projectedDrift: projectDrift(account.id, trades, taxAware, driftThreshold, proposed[i]!.modelId, proposed[i]!.heldBack),
    }
  })
}

/** A rebalance of a custom mandate with no model named: there is no model to rebalance it to. */
const unknownModel = (modelId: string) =>
  HttpResponse.json({ error: `${new UnknownModelError(modelId).message}: name one of the firm's models` }, { status: 422 })
const notModelManaged = (accountId: string) =>
  HttpResponse.json({ error: `${accountId} is a custom mandate, not model-managed: name a model to preview it against` }, { status: 422 })

export const omsHandlers = [
  // Proposal-level pre-trade check — all legs applied to one projected portfolio, end state checked,
  // each violation attributed to its legs. See `evaluateProposal` in `compliance.ts`.
  http.post('/api/oms/orders/pre-check-proposal', async ({ request }) => {
    const body = await request.json() as PreTradeCheckProposalRequest
    const invalid = invalidProposal(body.trades)
    if (invalid) return HttpResponse.json({ error: invalid }, { status: 400 })
    const result = evaluateProposal(body.accountId, body.trades)
    if (!result) return notFound()
    return HttpResponse.json(result)
  }),

  http.post('/api/oms/rebalance', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; driftThreshold?: number; taxAware: boolean; modelId?: string }
    if (body.modelId !== undefined && !MODEL_DEFINITIONS.some((m) => m.id === body.modelId)) return unknownModel(body.modelId)
    const proposed: PreviewEntry[] = []
    for (const accountId of body.accountIds) {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) return notFound()
      if (account.mandate === 'custom' && body.modelId === undefined) return notModelManaged(account.id)
      // The Rebalance page's drift-threshold control was sent and ignored; `driftThreshold` was
      // in scope one line away.
      proposed.push({ account, ...(body.modelId === undefined ? {} : { modelId: body.modelId }), ...generateRebalanceProposal(accountId, body.taxAware, body.driftThreshold, body.modelId) })
    }
    return HttpResponse.json(buildRebalancePreviews(proposed, body.taxAware, body.driftThreshold, MOCK_TODAY_ISO))
  }),
]
