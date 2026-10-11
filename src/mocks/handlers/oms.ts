import { http, HttpResponse } from 'msw'
import type { Order, RebalancePreview, ProposedTrade, TradeRequest, PreTradeCheckRequest, PreTradeViolation } from '@/services/oms'
import { notFound } from './utils'
import { RESTRICTED_SECURITIES, CASH_MINIMUM_PCT } from './compliance'
import { computeDriftForAccount, modelImplementationSecurity } from './pms'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { openWashSaleWindows } from '../data/realised-sales'
import { FX_RATES_USD_BASE } from '../data/currencies'
import { convertCurrency } from '@/lib/currency'
import { securityKind, concentrationLimitFor, isMarketTradable } from '@/lib/security-master'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { hasWashSaleRisk, isoDaysBefore } from '@/lib/wash-sale'
import { netTaxForLegs } from '@/lib/capital-gains'
import { generateTaxLots, boundedTradeQty } from './custodian'
import { taxRateFor } from '@/features/portfolios/tax/shared'
import type { Position, TaxLot } from '@/types/portfolio'
import type { CurrencyCode } from '@/types/currency'

/** Pooled/individual tech names used by the sector-concentration check below. */
const TECH_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA']
const SECTOR_LIMIT = 0.40

// Exported so `ai.ts`'s trading-desk chat response reads the same pending-order counts this
// handler serves, rather than a second, independently hand-typed "3 open orders" figure.
export const orders: Order[] = [
  // ── Recent orders for Johnson Family Trust (acc-001) ──
  { id: 'ord-001', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 150, orderType: 'market', status: 'filled', filledQuantity: 150, filledPrice: 268.35, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:02Z', assetClass: 'equity' },
  { id: 'ord-002', accountId: 'acc-001', symbol: 'AGG', side: 'buy', quantity: 500, orderType: 'market', status: 'filled', filledQuantity: 500, filledPrice: 98.42, submittedAt: '2026-02-24T14:30:00Z', filledAt: '2026-02-24T14:30:01Z', assetClass: 'equity' },
  { id: 'ord-003', accountId: 'acc-001', symbol: 'NVDA', side: 'sell', quantity: 25, orderType: 'limit', limitPrice: 785.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:31:00Z', assetClass: 'equity' },

  // ── Robert Johnson Individual (acc-002) ──
  // D28 — this fill is the same event as rs-001, so it prices at rs-001's $142,250 / 5,000 shares
  // and acc-002's INTC position now shows the 7,000 shares left after it.
  { id: 'ord-004', accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 5000, orderType: 'market', status: 'filled', filledQuantity: 5000, filledPrice: 28.45, submittedAt: '2026-02-21T10:15:00Z', filledAt: '2026-02-21T10:15:03Z', assetClass: 'equity' },
  { id: 'ord-005', accountId: 'acc-002', symbol: 'QQQ', side: 'buy', quantity: 200, orderType: 'limit', limitPrice: 480.00, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:35:00Z', assetClass: 'equity' },

  // ── Chen Irrevocable Trust (acc-006) ──
  { id: 'ord-006', accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 800, orderType: 'market', status: 'filled', filledQuantity: 800, filledPrice: 268.40, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:04Z', assetClass: 'equity' },
  { id: 'ord-007', accountId: 'acc-006', symbol: 'TLT', side: 'sell', quantity: 300, orderType: 'market', status: 'filled', filledQuantity: 300, filledPrice: 95.65, submittedAt: '2026-02-20T11:00:00Z', filledAt: '2026-02-20T11:00:02Z', assetClass: 'equity' },

  // ── David Williams Individual (acc-011) ──
  { id: 'ord-008', accountId: 'acc-011', symbol: 'SPY', side: 'buy', quantity: 100, orderType: 'market', status: 'submitted', filledQuantity: 0, submittedAt: '2026-02-25T10:00:00Z', assetClass: 'equity' },
  { id: 'ord-009', accountId: 'acc-011', symbol: 'BND', side: 'sell', quantity: 200, orderType: 'market', status: 'cancelled', filledQuantity: 0, submittedAt: '2026-02-24T15:45:00Z', assetClass: 'equity' },

  // ── Michael Martinez Individual (acc-015) ──
  { id: 'ord-010', accountId: 'acc-015', symbol: 'EFA', side: 'buy', quantity: 350, orderType: 'limit', limitPrice: 81.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T09:45:00Z', assetClass: 'equity' },
  { id: 'ord-011', accountId: 'acc-015', symbol: 'GLD', side: 'sell', quantity: 50, orderType: 'market', status: 'filled', filledQuantity: 50, filledPrice: 215.80, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:01Z', assetClass: 'equity' },
  { id: 'ord-012', accountId: 'acc-015', symbol: 'VNQ', side: 'buy', quantity: 200, orderType: 'market', status: 'filled', filledQuantity: 200, filledPrice: 89.15, submittedAt: '2026-02-24T13:20:00Z', filledAt: '2026-02-24T13:20:02Z', assetClass: 'equity' },

  // ── Multi-asset orders ──
  // D26 — a mutual fund order cannot fill at 11:00 ET. Rule 22c-1 requires forward pricing at the
  // next computed NAV, which for VFIAX is 4:00 PM ET (21:00Z), and a $25,000 dollar-amount purchase
  // buys $25,000 / $465.32 shares, not the placeholder 1.
  //
  // 53.72647 — five decimals, because no shorter rounding reconciles: 53.73 multiplies out to
  // $25,001.64, and 53.727 to $25,000.25, while 53.72647 x 465.32 = $25,000.00103, which agrees with
  // `dollarAmount` to the cent. Fractional-share precision beyond the three decimals retail
  // statements usually display is a settlement-layer detail; the arithmetic is the reason here, not
  // a claim about any particular clearing system's record layout.
  { id: 'ord-013', accountId: 'acc-001', symbol: 'VFIAX', side: 'purchase', quantity: 53.72647, orderType: 'market', status: 'filled', filledQuantity: 53.72647, filledPrice: 465.32, submittedAt: '2026-02-23T15:00:00Z', filledAt: '2026-02-23T21:00:00Z', assetClass: 'mutual_fund', dollarAmount: 25000, amountType: 'dollars' },
  { id: 'ord-014', accountId: 'acc-002', symbol: 'UST-10Y', side: 'buy', quantity: 50, orderType: 'limit', limitPrice: 95.25, status: 'filled', filledQuantity: 50, filledPrice: 95.20, submittedAt: '2026-02-22T10:30:00Z', filledAt: '2026-02-22T10:30:05Z', assetClass: 'fixed_income', parAmount: 50000, bondPriceType: 'price', priceOrYield: 95.25 },
  // D27 — spot BTC settled into acc-002, a Schwab brokerage that can only hold the IBIT and ETHE
  // ETFs. It belongs in acc-045, the Coinbase account that actually custodies coins, and at the one
  // BTC price the app knows.
  { id: 'ord-015', accountId: 'acc-045', symbol: 'BTC', side: 'buy', quantity: 0.25, orderType: 'market', status: 'filled', filledQuantity: 0.25, filledPrice: 87_450.00, submittedAt: '2026-02-21T14:15:00Z', filledAt: '2026-02-21T14:15:01Z', assetClass: 'digital_asset', fractionalQuantity: true },
  { id: 'ord-016', accountId: 'acc-006', symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, orderType: 'limit', limitPrice: 8.50, status: 'pending', filledQuantity: 0, submittedAt: '2026-02-25T11:00:00Z', assetClass: 'option', underlying: 'AAPL', optionType: 'call', strikePrice: 185, expirationDate: '2026-03-21', contractMultiplier: 100 },
]

/**
 * §9.3 · currencies-and-fx — the one place an account's native currency is resolved for the
 * rebalance surface, so the preview and every trade on it read the same fact instead of each
 * re-deriving (and potentially disagreeing on) the USD fallback for an account with no
 * `baseCurrency` set.
 */
export function currencyForAccount(accountId: string): CurrencyCode {
  return accounts.find((a) => a.id === accountId)?.baseCurrency ?? 'USD'
}

type RealisedSale = { shortTerm: number; longTerm: number; tax: number; consumedLotIds: string[] }
const NOTHING_REALISED: RealisedSale = { shortTerm: 0, longTerm: 0, tax: 0, consumedLotIds: [] }

/**
 * Realise a sale of `notional` dollars out of `target`: the signed short- and long-term result
 * and the capital-gains tax on its gains, using the same per-lot generator the tax page reads (`generateTaxLots`) and the same rate function
 * (`taxRateFor`) it applies — a short-term-heavy sell is taxed at `SHORT_TERM_RATE` (37%), not
 * silently at the long-term rate (23.8%) for the entire position. A tax-aware pass sells the
 * lowest-gain-fraction (highest cost basis) lots first to minimise realised gain; a tax-unaware
 * pass sells the lots in their own oldest-first order.
 */
function realiseSale(accountLots: readonly TaxLot[], target: Position, notional: number, taxAware: boolean): RealisedSale {
  const lots = accountLots.filter((l) => l.positionId === target.id)
  if (lots.length === 0 || notional <= 0) return NOTHING_REALISED
  // Minimise realised gain and rank by *tax per dollar sold*, not gain per dollar sold: a
  // low-gain short-term lot (37% rate) can carry more tax than a low-gain long-term lot (23.8%
  // rate), so sorting by gain fraction alone can pick a worse-taxed lot first.
  const taxPerDollar = (l: (typeof lots)[number]) => (l.gainLoss / l.currentValue) * taxRateFor(l.holdingPeriod)
  const ordered = taxAware ? [...lots].sort((a, b) => taxPerDollar(a) - taxPerDollar(b)) : lots

  let remaining = notional
  let shortTerm = 0
  let longTerm = 0
  let tax = 0
  const consumedLotIds: string[] = []
  for (const lot of ordered) {
    if (remaining <= 0 || lot.currentValue <= 0) continue
    const portion = Math.min(1, remaining / lot.currentValue)
    consumedLotIds.push(lot.id)
    const realised = lot.gainLoss * portion
    if (lot.holdingPeriod === 'short') shortTerm += realised
    else longTerm += realised
    if (realised > 0) tax += realised * taxRateFor(lot.holdingPeriod)
    remaining -= lot.currentValue * portion
  }
  return { shortTerm: Math.round(shortTerm), longTerm: Math.round(longTerm), tax: Math.max(0, Math.round(tax)), consumedLotIds }
}

/**
 * What a proposed trade executes against: a symbol, its price **in the account's own currency**,
 * and — for a sell — the position being trimmed. A buy into an asset class the account holds
 * nothing in has no position, which is precisely §9.7's point.
 */
type TradeCandidate = { symbol: string; name: string; price: number; position?: Position }

/**
 * The model sleeve a leg is trading, carried alongside the leg rather than re-derived by whoever
 * needs it.
 *
 * Task 9 · the model-trade preview has to say *why* it proposes each trade, and its `reason`
 * string is exactly this sleeve's drift stated in words ("US Equity 47.2% against a 42.0%
 * target"). Recomputing the weights in `trading.ts` to write that sentence would put the
 * rebalance engine's arithmetic and the sentence describing it in two files, free to disagree —
 * the "one fact, two places" failure this phase exists to remove, and the one the fabricated
 * handler committed most visibly by printing "from 47% to 42%" for all 47 accounts. The engine
 * already knows these three numbers; it now hands them on instead of dropping them.
 */
type Sleeve = {
  assetClass: string
  /** The account's own weight in this class, renormalised — `computeDriftForAccount`'s `actual`. */
  actualWeight: number
  /** The model's target weight for it — the same figure the drift surface bands against. */
  targetWeight: number
}

export type ProposedTradeLeg = ProposedTrade & Sleeve

/**
 * §9.7 · the order in which an overweight class is sold down. The engine used to take
 * `candidates[0]` — the fixture's declaration order — so acc-002 trimmed SPY, carrying a
 * $355,206.70 embedded gain, while INTC sat in the same asset class with a $45,850 unrealised
 * loss. A "tax-aware" toggle that picks a materially worse tax outcome than an obvious loss lot
 * already in the account is worse than no toggle.
 *
 * Ranking is by **gain per dollar of market value** — gain per dollar *sold*, the same
 * per-dollar logic `realiseSale` applies across lots — not by absolute gain, which would
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
 * Gated on `taxable`: in an IRA or a Roth, gains are not taxed at all (`realiseSale` already
 * returns 0 there), so re-ordering by embedded gain would be an arbitrary preference dressed up
 * as tax awareness. Those accounts keep the held order under either toggle setting.
 *
 * A tax-aware pass also never sells a position whose every lot is `recentlyOpened` (held 31 days
 * or fewer). Such a position is, in practice, a harvest replacement: acc-002's 180 SMH were
 * bought 2026-02-21 to keep semiconductor exposure after the INTC loss sale (note-002, comp-006),
 * and at zero gain they ranked ahead of SPY, so the toggle sold them four days later and undid the
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
function recentlyOpenedPositions(lots: readonly TaxLot[], asOfISO: string): Set<string> {
  const since = isoDaysBefore(asOfISO, REPLACEMENT_HOLD_DAYS)
  const hasOlderLot = new Set(lots.filter((l) => l.purchaseDate < since).map((l) => l.positionId))
  return new Set(lots.filter((l) => !hasOlderLot.has(l.positionId)).map((l) => l.positionId))
}

/**
 * §9.7 · which security to buy into an underweight class. An account that already holds the class
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
 * stays native (matching the trade's own `currency` tag, §9.3) and `quantity` is a real share
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
 * C26 · rebalancing / tax-efficiency — `taxImpact: taxAware ? 3_800 : 0` made the riskier setting
 * display as free. Tax is estimated per-lot from the account's actual embedded gains at the
 * lot's own holding-period rate, so a tax-unaware rebalance realises MORE than a tax-aware one,
 * never zero — and a Roth IRA or traditional IRA (`isTaxableAccount`) shows zero, always.
 *
 * Trades come from the account's own drift (`computeDriftForAccount`, the same function the
 * drift surface reads) filtered by the caller's own `driftThreshold` (the Rebalance page's
 * control), not a hardcoded 0.005. `d.actual > d.target` is what tells an overweight asset class
 * (sell) from an underweight one (buy). Task 21 made `d.drift` **signed** (negative = underweight),
 * so both the threshold test and the notional take `Math.abs` — comparing the raw value against a
 * positive threshold would silently drop every underweight class, leaving an all-sell proposal.
 *
 * Fix round 3 — self-financing applies to the **sell** side only, and only to avoid stranding
 * proceeds that have nowhere to go: `sellScale` caps sells at what the buy side can actually
 * absorb, which correctly falls to **zero** — propose nothing — when there is nothing at all to
 * absorb them (round 2's `totalBuy > 0 &&` guard left this branch unscaled instead, which read
 * as a short sale in a long-only demo on the account's proxy holding for an asset class it's
 * overweight but can't rebalance out of). Buys are **never** capped: an account draws on its own
 * cash reserve to fund a purchase, exactly as it always could — capping buys to match sells
 * (round 2's `buyScale`) needlessly shrank purchases an account had ample cash to make outright,
 * leaving both the overweight-cash and the underweight-target gaps uncorrected.
 *
 * Fix round 4 — proceeds have a second home the round-3 cap ignored: **cash itself**. `cash` is
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
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return []
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account, modelId)
  const taxable = isTaxableAccount(account.taxTreatment)
  const currency = currencyForAccount(accountId)
  const lossWindows = openWashSaleWindows(MOCK_TODAY_ISO, account.householdId)
  // The account's own lots are generated once and shared by the sell ordering, every leg's
  // `realiseSale`, and the household acquisitions below.
  const ownLots = generateTaxLots(account.id, account.totalValue)
  const recentlyOpened = recentlyOpenedPositions(ownLots, MOCK_TODAY_ISO)
  const acquisitions = accounts.filter((a) => a.householdId === account.householdId).flatMap((a) => {
    const symbolOf = new Map(getPositionsForAccount(a.id, a.totalValue).map((p) => [p.id, p.symbol]))
    const lots = a.id === account.id ? ownLots : generateTaxLots(a.id, a.totalValue)
    return lots.map((l) => {
      const symbol = symbolOf.get(l.positionId)
      if (symbol === undefined) throw new Error(`tax lot ${l.id} in ${a.id} names unknown position ${l.positionId}`)
      return { symbol, date: l.purchaseDate, lotId: l.id }
    })
  })

  type RawLeg = { target: TradeCandidate; side: 'buy' | 'sell'; notional: number; sleeve: Sleeve }

  const raw = drift.assetClassDrifts
    .filter((d) => Math.abs(d.drift) > driftThreshold)
    .flatMap((d): RawLeg[] => {
      const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
      const side: 'buy' | 'sell' = d.actual > d.target ? 'sell' : 'buy'
      const rawNotional = Math.abs(d.drift) * account.totalValue
      const sleeve: Sleeve = { assetClass: d.assetClass, actualWeight: d.actual, targetWeight: d.target }

      if (side === 'sell') {
        // A sell can only ever come from a position actually held — there is no short side here.
        // Draw candidates in preference order and keep filling until the sleeve's notional is met
        // or the candidates are exhausted; each leg is still capped at its own position's market
        // value, so long-only holds leg by leg as well as in aggregate.
        let remaining = rawNotional
        const legs: RawLeg[] = []
        for (const position of orderSellCandidates(held, taxAware && taxable, recentlyOpened)) {
          if (remaining <= 0) break
          const notional = Math.min(remaining, position.marketValue)
          if (notional <= 0) continue
          legs.push({
            target: { symbol: position.symbol, name: position.name, price: position.price, position },
            side,
            notional,
            sleeve,
          })
          remaining -= notional
        }
        return legs
      }

      const target = pickBuyCandidate(held, drift.modelId, d.assetClass, currency)
      if (!target) return []
      return [{ target, side, notional: rawNotional, sleeve }]
    })

  const totalSell = raw.filter((t) => t.side === 'sell').reduce((s, t) => s + t.notional, 0)
  const totalBuy = raw.filter((t) => t.side === 'buy').reduce((s, t) => s + t.notional, 0)
  // Cash is a model asset class with its own target, but it never yields a tradeable candidate,
  // so it can only ever absorb proceeds — never generate a buy. The **target** weight is read
  // from the same `computeDriftForAccount` result the trades come from, so the band shown on the
  // drift surface is the band the cap enforces.
  //
  // The **actual** side is deliberately taken in money, from the CASH position itself, not from
  // `cashDrift.actual`. `positions.ts` hand-types each position's `weight` to three decimals and
  // `computeDriftForAccount` renormalises them, so the cash weight it reports differs from
  // `cashBalance / totalValue` by up to ~0.06 of a point — $4,695 on acc-001, $4,470 on acc-006.
  // While buys were small that slack never bound; once §9.7 lets an account buy the classes it
  // holds nothing in, `buyCapacity` is consumed to the last dollar and the slack lands straight
  // in the post-trade cash balance: acc-001 spent down to 4.943% actual cash against a 5% target,
  // acc-044 to 4.977%, acc-045 to 2.972%, acc-046 to 9.959% — real breaches of the model's own
  // cash floor, sized by a rounding artefact in a display weight. Cash to spend is cash, so it is
  // measured in cash. The CASH position's market value equals `account.cashBalance` for all 47
  // accounts (`cash-cap-invariants` pins it); the fallback covers an account with no CASH row.
  const cashDrift = drift.assetClassDrifts.find((d) => d.assetClass === 'cash')
  const cashValue = positions.find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance
  const cashTargetValue = (cashDrift?.target ?? 0) * account.totalValue
  const cashHeadroom = Math.max(0, cashTargetValue - cashValue)

  // §9.6 · the round-4 cap above stops sells pushing cash above target. Nothing stopped
  // uncapped buys pulling it below — acc-043 sold €648,900, bought €909,760, and its cash fell
  // 13.69% -> 5.56% against a 10% target. The mirror bound: buys draw on cash, and an account
  // may not spend below its own cash target to fund them. `buyCapacity` is what sells raise
  // plus the cash genuinely available above target — the `cashAboveTarget` term is what makes
  // this correct where a round-2 attempt (`buyScale = totalSell / totalBuy`, capping buys to
  // match sells alone, reverted in round 3) was not: acc-006 legitimately funds buys from its
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
  //    and fall only to target (`cashAboveTarget`), which is Task 7's two-sided invariant.
  // This is not new behaviour — it is the choice the floor already made, now named. The existing
  // acc-015 test below ('the floor on cashAboveTarget lets the full $113,820 buy through') is its
  // pin: acc-015 is 0.6 points *under* its cash target and still deploys the full buy.
  const cashAboveTarget = Math.max(0, cashValue - cashTargetValue)

  /**
   * Build one executable leg: scale the notional, convert it to a tradeable lot, and take the
   * value **from the lot** rather than from the notional the lot came from.
   */
  const toTrade = ({ target, side, notional: rawNotional, sleeve }: RawLeg, scale: number): ProposedTradeLeg => {
    const notional = rawNotional * scale
      // §9.7 · `Math.round(notional / price)` rounded a share count **up**, so a sell could name
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
      const realised = side === 'sell' && taxable && target.position
        ? realiseSale(ownLots, target.position, estimatedValue, taxAware)
        : NOTHING_REALISED
      return {
        symbol: target.symbol,
        name: target.name,
        side,
        quantity,
        estimatedValue,
        taxImpact: realised.tax,
        realisedShortTerm: realised.shortTerm,
        realisedLongTerm: realised.longTerm,
        washSaleRisk: hasWashSaleRisk(
          { symbol: target.symbol, side, realisesLoss: realised.shortTerm + realised.longTerm < 0, soldLotIds: realised.consumedLotIds },
          lossWindows, acquisitions, MOCK_TODAY_ISO,
        ),
        currency,
        ...sleeve,
      }
  }

  // Build one side of the proposal at a given scale and report the money it **actually** moves —
  // the sum of the executed leg values, not of the un-floored notionals they came from. That
  // figure is what both cash caps below are sized against.
  const built = new Map<RawLeg, ProposedTradeLeg>()
  const build = (side: 'buy' | 'sell', scale: number): number => {
    let executed = 0
    for (const leg of raw) {
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

  // §9.6/§9.7 · the two caps are two halves of one statement about the money the proposal moves
  // into cash. With `endCash = cashValue − executedBuy + executedSell` required to lie between
  // where the account started and its own model cash target:
  //
  //     −cashAboveTarget  ≤  executedSell − executedBuy  ≤  cashHeadroom
  //
  // One bound is the target the account is moving toward; the other is where it started. **Both
  // are real, and both must be measured on executed money** — which is the round-4 correction
  // applied to only one of them. Round 4 made the *binding* cap on each branch read the executed
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
  // Task 9 · the previous form ran a fixed **four** passes and then simply returned whatever it
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

  // Emitted in the drift surface's own asset-class order, so a preview reads the same way it did
  // before sells and buys were built in separate passes.
  return raw.map((leg) => built.get(leg)).filter((t): t is ProposedTradeLeg => t !== undefined)
}

export const omsHandlers = [
  http.get('/api/oms/orders', ({ request }) => {
    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId')
    const status = url.searchParams.get('status')
    const assetClass = url.searchParams.get('assetClass')

    let filtered = orders
    if (accountId) filtered = filtered.filter((o) => o.accountId === accountId)
    if (status) filtered = filtered.filter((o) => o.status === status)
    if (assetClass) filtered = filtered.filter((o) => o.assetClass === assetClass)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/oms/orders/:orderId', ({ params }) => {
    const order = orders.find((o) => o.id === params.orderId)
    if (!order) return notFound()
    return HttpResponse.json(order)
  }),

  http.post('/api/oms/orders', async ({ request }) => {
    const body = await request.json() as TradeRequest
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      accountId: body.accountId,
      symbol: body.symbol,
      side: body.side,
      quantity: body.quantity,
      orderType: body.orderType,
      limitPrice: body.limitPrice,
      stopPrice: body.stopPrice,
      status: 'submitted',
      filledQuantity: 0,
      submittedAt: new Date().toISOString(),
      assetClass: body.assetClass,
      timeInForce: body.timeInForce,
      extendedHours: body.extendedHours,
      underlying: body.underlying,
      optionType: body.optionType,
      strikePrice: body.strikePrice,
      expirationDate: body.expirationDate,
      contractMultiplier: body.contractMultiplier,
      amountType: body.amountType,
      dollarAmount: body.dollarAmount,
      exchangeTargetSymbol: body.exchangeTargetSymbol,
      parAmount: body.parAmount,
      bondPriceType: body.bondPriceType,
      priceOrYield: body.priceOrYield,
      fractionalQuantity: body.fractionalQuantity,
      estimatedValue: body.estimatedValue,
      commission: body.commission,
    }
    orders.push(newOrder)
    return HttpResponse.json(newOrder, { status: 201 })
  }),

  // Pre-trade compliance check
  http.post('/api/oms/orders/pre-check', async ({ request }) => {
    const body = await request.json() as PreTradeCheckRequest
    const violations: PreTradeViolation[] = []
    const sym = body.symbol.toUpperCase()

    // C28 · pre-trade-compliance / order-lifecycle — notional is required and must be a real,
    // positive amount. Zero and negative values are finite too, and a zero-notional order would
    // otherwise pass every check with an affirmative "compliant" result.
    if (typeof body.estimatedValue !== 'number' || !Number.isFinite(body.estimatedValue) || body.estimatedValue <= 0) {
      return HttpResponse.json(
        { error: 'estimatedValue (notional) must be a positive number for a pre-trade check' },
        { status: 400 },
      )
    }
    const estValue = body.estimatedValue

    const account = accounts.find((a) => a.id === body.accountId)
    if (!account) return notFound()
    // C27 · pre-trade-compliance — the account's own market value, in the account's own base
    // currency, not a hardcoded $2,500,000. `accountValueUSD` would mix a USD-converted
    // denominator against `positions`' native-currency `marketValue`/`cashBalance`, inflating
    // every weight in the four non-USD accounts by their FX rate (acc-041 HKD by ~7.8x).
    const accountValue = account.totalValue
    const positions = getPositionsForAccount(account.id, account.totalValue)
    const existingPosition = positions.find((p) => p.symbol === sym)
    const existing = existingPosition?.marketValue ?? 0

    // C23 · diversification — per-kind limit (single-issuer / fund / cash), not a blanket 10%.
    const kind = securityKind(sym, existingPosition?.assetClass ?? 'us_equity')
    const limit = concentrationLimitFor(kind)
    const isBuy = body.side.startsWith('buy') || body.side === 'purchase'
    const postTradeWeight = (existing + (isBuy ? estValue : -estValue)) / accountValue

    if (postTradeWeight > limit * 0.8) {
      violations.push({
        constraint: kind === 'single_name' ? 'Single-issuer concentration limit' : 'Pooled-vehicle concentration limit',
        severity: postTradeWeight > limit ? 'block' : 'warning',
        currentValue: `${(postTradeWeight * 100).toFixed(1)}%`,
        limit: `${(limit * 100).toFixed(1)}%`,
        message: `${sym} would be ${(postTradeWeight * 100).toFixed(1)}% of this account against a ${(limit * 100).toFixed(1)}% IPS limit.`,
      })
    }

    // Restricted securities check — D29: one list, shared with the pre-trade compliance engine.
    if (RESTRICTED_SECURITIES.has(sym)) {
      violations.push({
        constraint: 'Restricted securities list',
        severity: 'block',
        currentValue: sym,
        limit: 'Not permitted',
        message: `${sym} is on the firm restricted securities list. Trading is prohibited.`,
      })
    }

    // Wash sale check — derived from the household's actual realised loss sales (Task 14's
    // 61-day window), not a hand-typed symbol list. A wash sale is triggered by *repurchasing*
    // a security recently sold at a loss, so this applies to buys, and it is scoped to the
    // account's household — the same fact the tax page reads (`realisedSales` carries
    // `householdId`).
    if (isBuy) {
      const openWindow = openWashSaleWindows(MOCK_TODAY_ISO, account.householdId).find((w) => w.symbol === sym)
      if (openWindow) {
        violations.push({
          constraint: 'Wash sale rule (61-day window)',
          severity: 'warning',
          currentValue: `Sold at a loss ${openWindow.saleDate}`,
          limit: '61-day window',
          message: `${sym} was sold at a loss in this household on ${openWindow.saleDate}. Repurchasing before ${openWindow.end} may trigger a wash sale, disallowing the loss.`,
        })
      }
    }

    // Cash reserve check for buys — gated on the actual projected post-trade cash balance, not a
    // raw notional threshold. A buy that leaves cash comfortably above the floor must not warn
    // just because it happened to be a large trade.
    if (isBuy) {
      const postTradeCash = account.cashBalance - estValue
      const postTradeCashPct = (postTradeCash / accountValue) * 100
      if (postTradeCashPct < CASH_MINIMUM_PCT * 100) {
        violations.push({
          constraint: 'Cash reserve minimum (2%)',
          severity: postTradeCash < 0 ? 'block' : 'warning',
          currentValue: `${postTradeCashPct.toFixed(1)}%`,
          limit: `${(CASH_MINIMUM_PCT * 100).toFixed(1)}%`,
          message: `Post-trade cash balance would be ${postTradeCashPct.toFixed(1)}%, below the ${(CASH_MINIMUM_PCT * 100).toFixed(0)}% minimum reserve requirement.`,
        })
      }
    }

    // Sector concentration for known tech stocks — the account's actual technology exposure,
    // not a fixed 38.2%, and gated on the projected post-trade weight (same 0.8x-warn / 1.0x-block
    // ladder as the concentration check above), not a raw notional threshold that fired regardless
    // of whether the sector limit was anywhere close to being breached.
    if (TECH_SYMBOLS.includes(sym) && ['buy', 'buy_to_open'].includes(body.side)) {
      const techWeight = positions
        .filter((p) => TECH_SYMBOLS.includes(p.symbol))
        .reduce((sum, p) => sum + p.marketValue, 0) / accountValue
      const projected = techWeight + estValue / accountValue
      if (projected > SECTOR_LIMIT * 0.8) {
        violations.push({
          constraint: 'Sector concentration (Technology)',
          severity: projected > SECTOR_LIMIT ? 'block' : 'warning',
          currentValue: `${(projected * 100).toFixed(1)}%`,
          limit: `${(SECTOR_LIMIT * 100).toFixed(1)}%`,
          message: `Technology sector allocation would be ${(projected * 100).toFixed(1)}% after this trade (currently ${(techWeight * 100).toFixed(1)}%), against a ${(SECTOR_LIMIT * 100).toFixed(0)}% limit.`,
        })
      }
    }

    return HttpResponse.json({
      passed: violations.every((v) => v.severity !== 'block'),
      violations,
    })
  }),

  http.post('/api/oms/rebalance', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; driftThreshold?: number; taxAware: boolean }
    const previews: RebalancePreview[] = []
    for (const accountId of body.accountIds) {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) return notFound()
      // The Rebalance page's drift-threshold control was sent and ignored; `driftThreshold` was
      // in scope one line away.
      const trades = generateRebalanceTrades(accountId, body.taxAware, body.driftThreshold)
      const tax = netTaxForLegs(trades, taxRateFor)
      previews.push({
        accountId,
        // §9.3 — same source as every trade on this preview (`currencyForAccount`), so a preview
        // with zero proposed trades still carries a correct currency tag rather than an implicit
        // USD default.
        currency: currencyForAccount(accountId),
        trades,
        // §1222 — this proposal's legs netted (not year-to-date results, not other accounts); the
        // gross figure is kept so a surface can show what netting saved.
        estimatedTaxImpact: tax.net,
        grossTaxOnGains: tax.gross,
        // Whether a sale here is a taxable event at all; a surface reads it to tell "not taxed in
        // this account" from "taxed, and the result is zero".
        taxable: isTaxableAccount(account.taxTreatment),
      })
    }
    return HttpResponse.json(previews)
  }),

  http.post('/api/oms/rebalance/execute', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; taxAware: boolean }
    const results = body.accountIds.map((accountId) => ({
      accountId,
      status: 'submitted' as const,
      ordersCreated: generateRebalanceTrades(accountId, body.taxAware).length,
      estimatedCompletion: '2026-02-25T16:00:00Z',
    }))
    return HttpResponse.json(results)
  }),
]
