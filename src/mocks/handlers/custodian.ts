import { http, HttpResponse } from 'msw'
import type { Transaction } from '@/services/custodian'
import type { TaxLot } from '@/types/portfolio'
import { accounts } from '../data/accounts'
import { cashBalanceOf, getPositionsForAccount, seedPositionsForAccount } from '../data/positions'
import { bookOf, ledgerFills } from '../data/portfolio-ledger'
import { refuseExternal } from './workspace-http'
import { realizedSales } from '../data/realized-sales'
import { openWashSaleWindowsFor, sameWashSaleTaxpayer } from './tax-return'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { notFound } from './utils'
import { startOfToday, MOCK_TODAY_ISO } from '@/lib/clock'
import { matchWashedShares, type Acquisition } from '@/lib/wash-sale'
import { inceptionDate } from '@/lib/security-master'
import { tradingDayOnOrBefore } from '@/lib/trading-calendar'
import type { Account } from '@/types/account'

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * Lots must partition their position, and transactions
 * must be deterministic and priced from the position they reference. The previous generators
 * called `Math.random()` directly: lot cost basis was unrelated to the position's own `costBasis`
 * and `gainLoss` so lots never summed to the position, transaction prices were drawn from a fresh
 * random range unrelated to any real holding, and both modules changed on every page load.
 */
function seeded(str: string): () => number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let state = Math.abs(h) || 1
  return () => {
    state = (state * 1664525 + 1013904223) | 0
    return (state >>> 0) / 0x1_0000_0000
  }
}

/** Split 1.0 into `n` deterministic fractions that sum to exactly 1. */
function fractions(rand: () => number, n: number): number[] {
  const raw = Array.from({ length: n }, () => 0.5 + rand())
  const total = raw.reduce((s, v) => s + v, 0)
  const parts = raw.map((v) => v / total)
  // Absorb floating-point residual into the last part so the sum is exact.
  const residual = 1 - parts.reduce((s, v) => s + v, 0)
  parts[parts.length - 1]! += residual
  return parts
}

function quarterLabel(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return `Q${quarter} ${date.getUTCFullYear()}`
}

/**
 * Bound a random trade-quantity draw against `cap` — the running per-symbol balance for a sell,
 * or the position's own quantity for a buy — so a trade can never imply more shares than are
 * available. Round-2 review: capping only sells left buys unbounded, so a single buy could
 * dwarf the entire position (151 BTC bought into a 2.15 BTC holding); capping via
 * `Math.max(1, Math.floor(...))` also assumed the cap was always >= 1, which is unsound for any
 * sub-1-unit position (a fractional crypto holding below 1 unit) — the forced minimum of 1 would
 * exceed the cap. Whole-share positions trade in whole shares; a cap below one unit trades in
 * fractional units instead of flooring to zero and forcing an out-of-bounds minimum.
 *
 * `minimumUnits` is required rather than defaulted, because the two callers genuinely differ and
 * a default would hand one of them the other's policy silently. The transaction-history generator
 * passes **1**: it is inventing a trade that is known to have happened, and a zero-share row in a
 * statement is meaningless noise. The rebalance engine passes **0**: a sleeve whose notional
 * cannot afford one whole lot must trade *nothing*, not one lot. With `1`, whenever `rough < 1`
 * and `cap >= 1` the function rounds **up** — `boundedTradeQty(2.1487, 0.2287, 1, 1) === 1`, one
 * whole BTC ($87,450) against a $20,000 notional — which would breach both the long-only value
 * bound and the cash band by up to a full unit. No fixture reaches that today (the smallest leg
 * in the book is acc-045's BTC at 2 units, a genuine floor from 2.1487), but that leg is the
 * *last* in its sleeve's draw-down, so any fixture or threshold change leaving under $87,450 of
 * remaining notional at it flips the case live.
 */
export function boundedTradeQty(cap: number, rawQty: number, fraction: number, minimumUnits: 0 | 1): number {
  // Guarded uniformly rather than only where today's caller happens to be safe. The sole caller
  // always passes finite positives, but this is exported for reuse and its whole purpose is to
  // clamp — a caller deriving `cap` from a running balance can reach zero from the negative side
  // through float residue, and `NaN <= 0` is false, so an unguarded NaN would flow straight
  // through the cap check and be returned as a "quantity".
  if (!Number.isFinite(cap) || !Number.isFinite(rawQty) || !Number.isFinite(fraction)) return 0
  if (cap <= 0 || rawQty <= 0 || fraction <= 0) return 0
  const rough = Math.min(rawQty, cap * fraction)
  return cap >= 1 ? Math.min(cap, Math.max(minimumUnits, Math.floor(rough))) : Math.round(rough * 1e6) / 1e6
}

type TradeShell = {
  index: number
  date: Date
  dateStr: string
  side: 'buy' | 'sell'
  pos: ReturnType<typeof getPositionsForAccount>[number]
  rawQty: number
  fraction: number
}

/**
 * Positions whose purchase date is a recorded fact rather than synthesised. pos-265 is the SMH
 * bought on 2026-02-20 as the INTC replacement; seeding it 3–47 months old would contradict the
 * activity feed, the note and the compliance record that all date it.
 *
 * Only the date lives here. Such a position was opened in one purchase and not traded since, so
 * its quantity and cost basis in `positions.ts` *are* the purchase: the one lot `generateTaxLots`
 * emits and the one buy `generateTransactions` records are both read from the position, and the
 * three cannot drift apart.
 */
export const KNOWN_OPEN_DATES: ReadonlyMap<string, string> = new Map([['pos-265', '2026-02-20']])

/**
 * IRC §1222: long-term means held *more than* one year, so a lot bought exactly a year before
 * `asOfISO` is still short-term. Dates are ISO `YYYY-MM-DD`, compared as strings.
 */
export function holdingPeriodOn(purchaseISO: string, asOfISO: string): 'short' | 'long' {
  const anniversary = new Date(`${purchaseISO}T00:00:00Z`)
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1)
  return asOfISO > anniversary.toISOString().slice(0, 10) ? 'long' : 'short'
}

/** Whole months before `anchor` that still land on or after `inceptionISO`. */
export function monthsSinceInception(anchor: Date, inceptionISO: string): number {
  let months = 0
  for (;;) {
    const earlier = new Date(anchor)
    earlier.setUTCMonth(earlier.getUTCMonth() - (months + 1))
    if (earlier.toISOString().slice(0, 10) < inceptionISO) return months
    months += 1
  }
}

/**
 * Lot ages (whole months, oldest first) no older than `maxAge`, each a month younger than the one
 * before it once capped, so two lots of one position are never dated the same day by the cap.
 */
export function capLotAges(agesOldestFirst: readonly number[], maxAge: number): number[] {
  let ceiling = maxAge
  return agesOldestFirst.map((age) => {
    const capped = Math.max(0, Math.min(age, ceiling))
    ceiling = capped - 1
    return capped
  })
}

/** Whether `pos` was held on `dateISO` — false only before a known open date. */
function heldOn(pos: { id: string }, dateISO: string): boolean {
  const openedOn = KNOWN_OPEN_DATES.get(pos.id)
  return openedOn === undefined || dateISO.slice(0, 10) >= openedOn
}

export function generateTransactions(accountId: string, totalValue: number): Transaction[] {
  const baseDate = startOfToday()
  const rand = seeded(`txn:${accountId}`)
  const held = seedPositionsForAccount(accountId, totalValue).filter((p) => p.symbol !== 'CASH')
  const txns: Transaction[] = []
  const trades: TradeShell[] = []

  // Every realized sale in `realizedSales` appears in its own account's transaction stream as a
  // real sell (acc-002's INTC sale of 2026-02-20 among them). The PRNG below never draws
  // these symbols for its own buy/sell trades (see `tradePool`), so the match is exact — the
  // fixture's sale, not a coincidentally similar random one.
  const accountSales = realizedSales.filter((s) => s.accountId === accountId)
  const soldSymbols = new Set(accountSales.map((s) => s.symbol))
  const heldBySymbol = new Map(held.map((p) => [p.symbol, p]))
  // A position still held was opened when its oldest lot was bought: acc-002's INTC opening
  // was dated 2025-12-27 against a lot bought 2022-07-25, and a long-term sale (rs-001) cannot come
  // out of shares bought two months earlier.
  const oldestLotDate = new Map<string, string>()
  for (const lot of soldSymbols.size > 0 ? seedTaxLots(accountId, totalValue) : []) {
    const known = oldestLotDate.get(lot.positionId)
    if (known === undefined || lot.purchaseDate < known) oldestLotDate.set(lot.positionId, lot.purchaseDate)
  }

  // The running-balance model starts every symbol at zero 60 days ago — already unrealistic
  // (it implicitly claims the account held nothing two months ago), and it makes an injected sell
  // of an already-established position impossible without a preceding buy. Seed an opening balance
  // instead: `opening = current position quantity + total quantity sold in the window`. That's
  // self-consistent — the position existed before the window, the fixture sale(s) draw it down by
  // exactly the sold amount, and the running balance lands on today's real holding: 0 for
  // acc-007/acc-022 (sold out entirely) or the current quantity for acc-002/acc-015/acc-011 (sold
  // only part). Modeled as a real 'buy' transaction dated before the earliest of this symbol's
  // sales, so the existing per-symbol running-balance check — which recomputes balances from
  // the transaction stream alone, starting at zero — verifies the same invariant it already
  // verifies for every other symbol, rather than needing a carve-out.
  for (const symbol of soldSymbols) {
    const salesForSymbol = accountSales.filter((s) => s.symbol === symbol)
    const position = heldBySymbol.get(symbol)
    const currentQty = position?.quantity ?? 0
    const soldQty = salesForSymbol.reduce((sum, s) => sum + s.quantity, 0)
    const openingQty = currentQty + soldQty
    const openingCostBasis = (position?.costBasis ?? 0)
      + salesForSymbol.reduce((sum, s) => sum + s.costBasis, 0)
    const openingPrice = openingCostBasis / openingQty

    const earliestSaleMs = Math.min(
      ...salesForSymbol.map((s) => new Date(`${s.saleDate}T00:00:00Z`).getTime()),
    )
    // A position sold out entirely has no lot left to date it, so it opens just before the
    // 60-day window or the day before its first sale, whichever is earlier, rolled back to a
    // trading day (final review I2: the 60-day mark is Saturday 2025-12-27).
    const openedOn = position ? oldestLotDate.get(position.id) : undefined
    const fallbackOpening = new Date(Math.min(baseDate.getTime() - 60 * DAY_MS, earliestSaleMs - DAY_MS)).toISOString()
    const openingMs = new Date(`${openedOn ?? tradingDayOnOrBefore(fallbackOpening)}T00:00:00Z`).getTime()

    txns.push({
      id: `txn-${accountId}-opening-${symbol}`,
      accountId,
      date: new Date(openingMs).toISOString(),
      type: 'buy',
      symbol,
      description: `Opening balance — ${symbol}`,
      amount: -openingCostBasis,
      quantity: openingQty,
      price: openingPrice,
    })
  }

  for (const sale of accountSales) {
    txns.push({
      id: `txn-${sale.id}`,
      accountId,
      date: new Date(`${sale.saleDate}T00:00:00Z`).toISOString(),
      type: 'sell',
      symbol: sale.symbol,
      description: `Sold ${sale.quantity.toLocaleString('en-US')} shares ${sale.symbol}`,
      amount: sale.proceeds,
      quantity: sale.quantity,
      price: sale.proceeds / sale.quantity,
    })
  }

  // A position with a recorded open date gets that purchase as its one buy — its whole quantity
  // at its cost basis — and is kept out of the synthetic draws below.
  for (const pos of held) {
    const openedOn = KNOWN_OPEN_DATES.get(pos.id)
    if (openedOn === undefined) continue
    txns.push({
      id: `txn-${accountId}-open-${pos.id}`,
      accountId,
      date: new Date(`${openedOn}T00:00:00Z`).toISOString(),
      type: 'buy',
      symbol: pos.symbol,
      description: `Bought ${pos.quantity.toLocaleString('en-US')} shares ${pos.symbol}`,
      amount: -pos.costBasis,
      quantity: pos.quantity,
      price: pos.costBasis / pos.quantity,
    })
  }

  // The PRNG's own buy/sell draws pick from this pool, which excludes every symbol carrying a
  // real fixture sale — so a random draw can never dilute, duplicate, or contradict a narrative
  // sale, and the opening-balance seed above never has to reconcile against an unpredictable
  // random trade on the same symbol.
  const tradePool = held.filter((p) => !soldSymbols.has(p.symbol))

  // Generate ~20 transactions over the past 60 days
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(rand() * 60)
    const date = new Date(baseDate)
    date.setUTCDate(date.getUTCDate() - daysAgo)
    const dateStr = date.toISOString()

    const typeRoll = rand()
    if (typeRoll < 0.4 && tradePool.length > 0) {
      // Buy/sell — quantity is resolved below in a chronological second pass (see `trades`),
      // so a trade can never imply a negative running balance for its symbol.
      const side = rand() > 0.5 ? 'buy' : 'sell'
      const pos = tradePool[Math.floor(rand() * tradePool.length)]!
      const rawQty = Math.floor(rand() * 200) + 10
      const fraction = 0.05 + rand() * 0.35
      // A draw landing on a known-open position makes no trade (its history is the one recorded
      // purchase). Dropping the draw rather than shrinking `tradePool` leaves the PRNG stream, and
      // so every other symbol's synthetic history, exactly as it was.
      if (!KNOWN_OPEN_DATES.has(pos.id)) trades.push({ index: i, date, dateStr, side, pos, rawQty, fraction })
    } else if (typeRoll < 0.6) {
      // Dividend — a plausible quarterly yield (0.2%–0.8%) on the position actually named,
      // rather than an arbitrary fraction of total account value.
      const pos = held[Math.floor(rand() * held.length)]!
      const amount = Math.round(pos.marketValue * (0.002 + rand() * 0.006) * 100) / 100
      // No dividend on a position before it was bought; the draw is dropped, not redrawn, for the
      // same PRNG-stability reason as the trade draw above.
      if (heldOn(pos, dateStr)) {
        txns.push({
          id: `txn-${accountId}-${i}`, accountId, date: dateStr,
          type: 'dividend', symbol: pos.symbol, description: `Dividend — ${pos.symbol}`, amount,
        })
      }
    } else if (typeRoll < 0.75) {
      // Interest
      const amount = Math.round(totalValue * 0.0003 * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: 'interest', description: 'Money market interest', amount,
      })
    } else if (typeRoll < 0.9) {
      // Fee
      const amount = Math.round(totalValue * 0.00025 * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: 'fee', description: `Advisory fee — ${quarterLabel(date)}`, amount: -amount,
      })
    } else {
      // Transfer
      const amount = Math.round((rand() * 50000 + 5000) * 100) / 100
      const direction = rand() > 0.5 ? 'transfer_in' : 'transfer_out'
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: direction, description: direction === 'transfer_in' ? 'Wire deposit' : 'Wire withdrawal',
        amount: direction === 'transfer_in' ? amount : -amount,
      })
    }
  }

  // Resolve buy/sell quantities oldest-first, carrying a running balance per symbol, so no
  // trade can imply a negative holding at any point in the simulated 60-day window. A 'sell'
  // against a symbol with no accumulated balance is reclassified as a 'buy' — there is nothing
  // to sell yet this early in the window. This does not reconcile the running balance to the
  // account's current position quantity (a stronger property); see the code comment on
  // `boundedTradeQty` and the task report for why that stronger property was not attempted.
  const balances = new Map<string, number>()
  const chronological = [...trades].sort((a, b) => a.date.getTime() - b.date.getTime())
  for (const trade of chronological) {
    const symbol = trade.pos.symbol
    const balance = balances.get(symbol) ?? 0
    const side = trade.side === 'sell' && balance <= 0 ? 'buy' : trade.side
    const cap = side === 'sell' ? balance : trade.pos.quantity
    // 1: a statement row for a trade that happened names at least one share.
    const qty = boundedTradeQty(cap, trade.rawQty, trade.fraction, 1)
    balances.set(symbol, side === 'buy' ? balance + qty : balance - qty)

    const price = trade.pos.price
    txns.push({
      id: `txn-${accountId}-${trade.index}`, accountId, date: trade.dateStr,
      type: side, symbol, description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} shares ${symbol}`,
      amount: side === 'buy' ? -(qty * price) : qty * price, quantity: qty, price,
    })
  }

  // The session's fills follow the fixture history, as the custodian would report them.
  for (const fill of ledgerFills().filter((f) => f.accountId === accountId)) {
    txns.push({
      id: `txn-${fill.id}`, accountId, date: fill.at, type: fill.side, symbol: fill.symbol,
      description: `${fill.side === 'buy' ? 'Bought' : 'Sold'} ${fill.quantity.toLocaleString('en-US')} shares ${fill.symbol}`,
      amount: fill.side === 'buy' ? -fill.value : fill.value, quantity: fill.quantity, price: fill.price,
    })
  }

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * A lot as the custodian's records state it. `saleWash` is left off: it needs every lot of the
 * wash-sale taxpayer's accounts, so only the surfaces that show it (`generateTaxLotsWithSaleRisk`)
 * pay for it, not the rebalance engine, which tests its own sell legs.
 */
export type CustodianLot = Omit<TaxLot, 'saleWash'>

type LotFacts = Pick<TaxLot, 'id' | 'positionId' | 'purchaseDate' | 'quantity'>

/**
 * Every lot bought in an account of `account`'s wash-sale taxpayer (`sameWashSaleTaxpayer`), as a
 * §1091 acquisition — IRAs and Roths included, since a purchase in any of them is a replacement.
 * `lotsFor` supplies each account's lots, so a caller can pass the lots it already holds for its
 * own account.
 */
export function washSaleAcquisitions(account: Account, lotsFor: (a: Account) => readonly LotFacts[]): Acquisition[] {
  return sameWashSaleTaxpayer(account).flatMap((a) => {
    const symbolOf = new Map(getPositionsForAccount(a.id, a.totalValue).map((p) => [p.id, p.symbol]))
    const kind = isTaxableAccount(a.taxTreatment) ? 'taxable' : 'tax_advantaged'
    return lotsFor(a).map((l) => {
      const symbol = symbolOf.get(l.positionId)
      if (symbol === undefined) throw new Error(`tax lot ${l.id} in ${a.id} names unknown position ${l.positionId}`)
      return { symbol, date: l.purchaseDate, lotId: l.id, quantity: l.quantity, account: kind } as const
    })
  })
}

/**
 * The account's lots, each with `saleWash`: how many of its shares would have their loss taken by
 * §1091 if this account harvested every loss lot today (`matchWashedShares`), split by whether
 * that loss is deferred into a taxable replacement's basis or permanently disallowed by an IRA or
 * Roth replacement. A lot at a gain, and every lot in an account whose sales are not taxed, has
 * nothing to lose and reads 0/0; so does a coin held directly, which §1091 does not reach
 * (`matchWashedShares` skips it, `isSubjectToWashSale`).
 *
 * Each account is asked on its own, against every acquisition of its taxpayer. A total summed
 * across accounts (the book-level reading in `ai.ts`) may therefore count one replacement share
 * against two accounts' losses: it overstates what washes, the safe direction for a harvest.
 *
 * The rebalance engine reads the same acquisitions. Its generator's first `washSaleRisk` on a sell
 * leg judges the whole leg on its net result (`hasWashSaleRisk`); the preview then settles every
 * leg lot by lot (`settleBatchWashSales`), so a leg that nets to a gain is flagged, and carries
 * `washedLoss`, when any loss lot it sells washes, as its lots here would show.
 */
export function generateTaxLotsWithSaleRisk(accountId: string, totalValue: number): TaxLot[] {
  const own = generateTaxLots(accountId, totalValue)
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`tax lots requested for unknown account ${accountId}`)
  const lotsOf = new Map(sameWashSaleTaxpayer(account).map((a) => [a.id, a.id === accountId ? own : generateTaxLots(a.id, a.totalValue)]))
  const lotsFor = (a: Account) => lotsOf.get(a.id) ?? []
  const acquisitions = washSaleAcquisitions(account, lotsFor)
  const symbolOfLot = new Map(acquisitions.map((a) => [a.lotId, a.symbol]))
  const symbolOf = (lotId: string) => {
    const symbol = symbolOfLot.get(lotId)
    if (symbol === undefined) throw new Error(`tax lot ${lotId} is missing from its taxpayer's acquisitions`)
    return symbol
  }
  // Only this account's loss lots are sold in the question asked; replacements come from every
  // account of the taxpayer. Matching other accounts' losses too would let an older lot elsewhere
  // absorb the replacement shares and show this account's loss as clean.
  const lossLots = isTaxableAccount(account.taxTreatment)
    ? own.filter((l) => l.gainLoss < 0).map((l) => ({
      lotId: l.id, symbol: symbolOf(l.id), purchaseDate: l.purchaseDate, quantity: l.quantity,
    }))
    : []
  const washed = matchWashedShares(lossLots, acquisitions, MOCK_TODAY_ISO)
  return own.map((lot) => ({ ...lot, saleWash: washed.get(lot.id) ?? { deferredShares: 0, disallowedShares: 0 } }))
}

/**
 * The last day each symbol may not be bought back, for the account's
 * wash-sale taxpayer (`openWashSaleWindowsFor`), IRAs and Roths included. Windows arrive sorted by
 * `end`, so the last one written per symbol is the latest to close. An account that can't be
 * resolved restricts nothing.
 */
function repurchaseBlocksFor(accountId: string): Map<string, string> {
  const account = accounts.find((a) => a.id === accountId)
  return new Map(account ? openWashSaleWindowsFor(account, MOCK_TODAY_ISO).map((w) => [w.symbol, w.end]) : [])
}

/** The fixtures' lots, partitioning each fixture position: the book before the session moved it. */
export function seedTaxLots(accountId: string, totalValue: number): CustodianLot[] {
  const positions = seedPositionsForAccount(accountId, totalValue)
  const anchor = startOfToday()
  const lots: CustodianLot[] = []

  const repurchaseBlockedUntil = repurchaseBlocksFor(accountId)

  for (const pos of positions) {
    if (pos.symbol === 'CASH') continue
    const openedOn = KNOWN_OPEN_DATES.get(pos.id)
    if (openedOn) {
      lots.push({
        id: `lot-${pos.id}-0`,
        positionId: pos.id,
        purchaseDate: openedOn,
        quantity: pos.quantity,
        costBasis: pos.costBasis,
        currentValue: pos.marketValue,
        gainLoss: pos.marketValue - pos.costBasis,
        holdingPeriod: holdingPeriodOn(openedOn, MOCK_TODAY_ISO),
        repurchaseBlockedUntil: repurchaseBlockedUntil.get(pos.symbol) ?? null,
      })
      continue
    }
    const rand = seeded(`${accountId}:${pos.id}`)
    const lotCount = 1 + Math.floor(rand() * 3) // 1–3
    const shares = fractions(rand, lotCount)

    // Older lots first, so FIFO and LIFO orderings are meaningful.
    const drawnAges = Array.from({ length: lotCount }, () => 3 + Math.floor(rand() * 45))
      .sort((a, b) => b - a)
    // No lot predates its security: IBIT drew 2022 and 2023 dates for a fund launched in
    // January 2024. The draws are kept (the PRNG stream, and so every other lot, is unchanged)
    // and only capped at the inception.
    const inception = inceptionDate(pos.symbol)
    const ages = inception === undefined ? drawnAges : capLotAges(drawnAges, monthsSinceInception(anchor, inception))

    let allocatedQty = 0
    let allocatedBasis = 0
    let allocatedValue = 0
    for (let i = 0; i < lotCount; i++) {
      const isLast = i === lotCount - 1
      const share = shares[i]!
      const monthsAgo = new Date(anchor)
      // UTC, not local: `anchor` is UTC midnight, and local get/set-Month would bake in the
      // host timezone's day-of-month, making the serialized date machine-dependent.
      monthsAgo.setUTCMonth(monthsAgo.getUTCMonth() - ages[i]!)
      // A whole-month age anchored on the 25th lands on a weekend or holiday
      // about a third of the time, and a lot is bought on a day the market trades. The date rolls
      // back to the last trading day after the draws, so the PRNG stream is unchanged. A roll of a
      // few days never changes the holding period: the one lot near a year old (12 months,
      // 2025-02-25) falls on a Tuesday and stays put.
      const purchaseDate = tradingDayOnOrBefore(monthsAgo.toISOString())

      const quantity = isLast ? pos.quantity - allocatedQty
        : Math.round(pos.quantity * share * 1e6) / 1e6
      const costBasis = isLast ? pos.costBasis - allocatedBasis
        : Math.round(pos.costBasis * share)
      const currentValue = isLast ? pos.marketValue - allocatedValue
        : Math.round(pos.marketValue * share)

      allocatedQty += quantity
      allocatedBasis += costBasis
      allocatedValue += currentValue

      lots.push({
        id: `lot-${pos.id}-${i}`,
        positionId: pos.id,
        purchaseDate,
        quantity,
        costBasis,
        currentValue,
        gainLoss: currentValue - costBasis,
        // IRC §1222 requires *more than* one year for long-term treatment, so a lot exactly
        // 12 months old is short-term. A whole-month age makes this `holdingPeriodOn`'s rule
        // without the date arithmetic, which this hot path (every rebalance sweep) would pay.
        holdingPeriod: ages[i]! > 12 ? 'long' : 'short',
        repurchaseBlockedUntil: repurchaseBlockedUntil.get(pos.symbol) ?? null,
      })
    }
  }
  return lots
}

/** The account's lots as they stand: the ledger's once the session has moved the account, else the fixtures'. */
export function generateTaxLots(accountId: string, totalValue: number): CustodianLot[] {
  const moved = bookOf(accountId)
  if (!moved) return seedTaxLots(accountId, totalValue)
  const blocked = repurchaseBlocksFor(accountId)
  const symbolOf = new Map(moved.positions.map((p) => [p.id, p.symbol]))
  const symbolOfLot = (lot: { id: string; positionId: string }) => {
    const symbol = symbolOf.get(lot.positionId)
    if (symbol === undefined) throw new Error(`Lot ${lot.id} belongs to no position of account ${accountId}`)
    return symbol
  }
  return moved.lots.map((lot) => ({ ...lot, repurchaseBlockedUntil: blocked.get(symbolOfLot(lot)) ?? null }))
}

const withBookCash = (a: Account): Account => ({ ...a, cashBalance: cashBalanceOf(a) })

export const custodianHandlers = [
  http.get('/api/custodian/accounts/:accountId', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(withBookCash(account))
  }),

  http.get('/api/custodian/accounts/:accountId/tax-lots', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(generateTaxLotsWithSaleRisk(account.id, account.totalValue))
  }),

  http.get('/api/custodian/accounts/:accountId/realized-sales', ({ params, request }) => {
    const refused = refuseExternal(request)
    if (refused) return refused
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(openWashSaleWindowsFor(account, MOCK_TODAY_ISO))
  }),
]
