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
import { securityKind, concentrationLimitFor } from '@/lib/security-master'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { generateTaxLots } from './custodian'
import { taxRateFor } from '@/features/portfolios/tax/shared'
import type { Position } from '@/types/portfolio'
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
function currencyForAccount(accountId: string): CurrencyCode {
  return accounts.find((a) => a.id === accountId)?.baseCurrency ?? 'USD'
}

/**
 * Estimate the capital-gains tax on selling `notional` dollars out of `target`, using the same
 * per-lot generator the tax page reads (`generateTaxLots`) and the same rate function
 * (`taxRateFor`) it applies — a short-term-heavy sell is taxed at `SHORT_TERM_RATE` (37%), not
 * silently at the long-term rate (23.8%) for the entire position. A tax-aware pass sells the
 * lowest-gain-fraction (highest cost basis) lots first to minimise realised gain; a tax-unaware
 * pass sells the lots in their own oldest-first order.
 */
function estimateSaleTax(accountId: string, totalValue: number, target: Position, notional: number, taxAware: boolean): number {
  const lots = generateTaxLots(accountId, totalValue).filter((l) => l.positionId === target.id)
  if (lots.length === 0 || notional <= 0) return 0
  // Minimise realised gain and rank by *tax per dollar sold*, not gain per dollar sold: a
  // low-gain short-term lot (37% rate) can carry more tax than a low-gain long-term lot (23.8%
  // rate), so sorting by gain fraction alone can pick a worse-taxed lot first.
  const taxPerDollar = (l: (typeof lots)[number]) => (l.gainLoss / l.currentValue) * taxRateFor(l.holdingPeriod)
  const ordered = taxAware ? [...lots].sort((a, b) => taxPerDollar(a) - taxPerDollar(b)) : lots

  let remaining = notional
  let tax = 0
  for (const lot of ordered) {
    if (remaining <= 0 || lot.currentValue <= 0) continue
    const portion = Math.min(1, remaining / lot.currentValue)
    const realisedGain = lot.gainLoss * portion
    if (realisedGain > 0) tax += realisedGain * taxRateFor(lot.holdingPeriod)
    remaining -= lot.currentValue * portion
  }
  return Math.max(0, Math.round(tax))
}

/**
 * What a proposed trade executes against: a symbol, its price **in the account's own currency**,
 * and — for a sell — the position being trimmed. A buy into an asset class the account holds
 * nothing in has no position, which is precisely §9.7's point.
 */
type TradeCandidate = { symbol: string; name: string; price: number; position?: Position }

/**
 * §9.7 · which security to sell out of an overweight class. The engine used to take
 * `candidates[0]` — the fixture's declaration order — so acc-002 trimmed SPY, carrying a
 * $355,206.70 embedded gain, while INTC sat in the same asset class with a $45,850 unrealised
 * loss. A "tax-aware" toggle that picks a materially worse tax outcome than an obvious loss lot
 * already in the account is worse than no toggle.
 *
 * Ranking is by **gain per dollar of market value** — gain per dollar *sold*, the same
 * per-dollar logic `estimateSaleTax` applies across lots — not by absolute gain, which would
 * simply prefer whichever position happens to be biggest. Ascending order puts losses first
 * (harvestable), then the smallest embedded gains.
 *
 * Gated on `taxable`: in an IRA or a Roth, gains are not taxed at all (`estimateSaleTax` already
 * returns 0 there), so re-ordering by embedded gain would be an arbitrary preference dressed up
 * as tax awareness. Those accounts keep the held order under either toggle setting.
 */
function pickSellCandidate(held: Position[], taxAware: boolean): Position | undefined {
  if (!taxAware) return held[0]
  const gainPerDollar = (p: Position) => (p.marketValue > 0 ? p.gainLoss / p.marketValue : 0)
  return [...held].sort((a, b) => gainPerDollar(a) - gainPerDollar(b))[0]
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
function generateRebalanceTrades(accountId: string, taxAware: boolean, driftThreshold = 0.005): ProposedTrade[] {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return []
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account)
  const taxable = isTaxableAccount(account.taxTreatment)
  const currency = currencyForAccount(accountId)

  const raw = drift.assetClassDrifts
    .filter((d) => Math.abs(d.drift) > driftThreshold)
    .flatMap((d): { target: TradeCandidate; side: 'buy' | 'sell'; notional: number }[] => {
      const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH')
      const side: 'buy' | 'sell' = d.actual > d.target ? 'sell' : 'buy'
      const rawNotional = Math.abs(d.drift) * account.totalValue

      if (side === 'sell') {
        // A sell can only ever come from a position actually held — there is no short side here.
        const position = pickSellCandidate(held, taxAware && taxable)
        if (!position) return []
        return [{
          target: { symbol: position.symbol, name: position.name, price: position.price, position },
          side,
          notional: Math.min(rawNotional, position.marketValue),
        }]
      }

      const target = pickBuyCandidate(held, drift.modelId, d.assetClass, currency)
      if (!target) return []
      return [{ target, side, notional: rawNotional }]
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
  const sellCapacity = totalBuy + cashHeadroom
  const sellScale = totalSell > 0 ? Math.min(1, sellCapacity / totalSell) : 1

  // §9.6 · the round-4 cap above stops sells pushing cash above target. Nothing stopped
  // uncapped buys pulling it below — acc-043 sold €648,900, bought €909,760, and its cash fell
  // 13.69% -> 5.56% against a 10% target. The mirror bound: buys draw on cash, and an account
  // may not spend below its own cash target to fund them. `buyCapacity` is what sells raise
  // plus the cash genuinely available above target — the `cashAboveTarget` term is what makes
  // this correct where a round-2 attempt (`buyScale = totalSell / totalBuy`, capping buys to
  // match sells alone, reverted in round 3) was not: acc-006 legitimately funds $912,000 of
  // buys from its own cash against only $540,000 of sells, and must continue to.
  const cashAboveTarget = Math.max(0, cashValue - cashTargetValue)
  const buyCapacity = totalSell + cashAboveTarget
  const buyScale = totalBuy > 0 ? Math.min(1, buyCapacity / totalBuy) : 1

  return raw
    .map(({ target, side, notional: rawNotional }) => {
      const notional = side === 'sell' ? rawNotional * sellScale : rawNotional * buyScale
      const taxImpact = side === 'sell' && taxable && target.position
        ? estimateSaleTax(account.id, account.totalValue, target.position, notional, taxAware)
        : 0
      return {
        symbol: target.symbol,
        name: target.name,
        side,
        quantity: Math.round(notional / target.price),
        estimatedValue: Math.round(notional),
        taxImpact,
        washSaleRisk: false,
        currency,
      }
    })
    .filter((t) => t.estimatedValue > 0)
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
    const previews: RebalancePreview[] = body.accountIds.map((accountId) => {
      // The Rebalance page's drift-threshold control was sent and ignored; `driftThreshold` was
      // in scope one line away.
      const trades = generateRebalanceTrades(accountId, body.taxAware, body.driftThreshold)
      return {
        accountId,
        // §9.3 — same source as every trade on this preview (`currencyForAccount`), so a preview
        // with zero proposed trades still carries a correct currency tag rather than an implicit
        // USD default.
        currency: currencyForAccount(accountId),
        trades,
        // C26 — the total is the sum of the trades' own tax impacts, not a second literal that
        // could (and did) disagree with them.
        estimatedTaxImpact: trades.reduce((sum, t) => sum + t.taxImpact, 0),
      }
    })
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
