import { http, HttpResponse } from 'msw'
import type { Transaction } from '@/services/custodian'
import type { TaxLot } from '@/types/portfolio'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { openWashSaleWindows, realisedSales } from '../data/realised-sales'
import { notFound } from './utils'
import { startOfToday, MOCK_TODAY_ISO } from '@/lib/clock'

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * C12 · tax-loss-harvesting / data-quality — lots must partition their position, and transactions
 * (D33) must be deterministic and priced from the position they reference. The previous generators
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
 */
export function boundedTradeQty(cap: number, rawQty: number, fraction: number): number {
  // Guarded uniformly rather than only where today's caller happens to be safe. The sole caller
  // always passes finite positives, but this is exported for reuse and its whole purpose is to
  // clamp — a caller deriving `cap` from a running balance can reach zero from the negative side
  // through float residue, and `NaN <= 0` is false, so an unguarded NaN would flow straight
  // through the cap check and be returned as a "quantity".
  if (!Number.isFinite(cap) || !Number.isFinite(rawQty) || !Number.isFinite(fraction)) return 0
  if (cap <= 0 || rawQty <= 0 || fraction <= 0) return 0
  const rough = Math.min(rawQty, cap * fraction)
  return cap >= 1 ? Math.min(cap, Math.max(1, Math.floor(rough))) : Math.round(rough * 1e6) / 1e6
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

function generateTransactions(accountId: string, totalValue: number): Transaction[] {
  const baseDate = startOfToday()
  const rand = seeded(`txn:${accountId}`)
  const held = getPositionsForAccount(accountId, totalValue).filter((p) => p.symbol !== 'CASH')
  const txns: Transaction[] = []
  const trades: TradeShell[] = []

  // C14 · data-integrity — every realised sale in `realisedSales` must appear in its own account's
  // transaction stream as a real sell (previously the two fixtures were unrelated: acc-002's
  // stream held exactly one sell, SPY, never the INTC sale the tax page reports as having
  // happened on 2026-02-21; acc-007's stream held zero sells at all). The PRNG below never draws
  // these symbols for its own buy/sell trades (see `tradePool`), so the match is exact — the
  // fixture's sale, not a coincidentally similar random one.
  const accountSales = realisedSales.filter((s) => s.accountId === accountId)
  const soldSymbols = new Set(accountSales.map((s) => s.symbol))
  const heldBySymbol = new Map(held.map((p) => [p.symbol, p]))

  // Task 13's running-balance model starts every symbol at zero 60 days ago — already unrealistic
  // (it implicitly claims the account held nothing two months ago), and it makes an injected sell
  // of an already-established position impossible without a preceding buy. Seed an opening balance
  // instead: `opening = current position quantity + total quantity sold in the window`. That's
  // self-consistent — the position existed before the window, the fixture sale(s) draw it down by
  // exactly the sold amount, and the running balance lands on today's real holding: 0 for
  // acc-007/acc-022 (sold out entirely) or the current quantity for acc-002/acc-015/acc-011 (sold
  // only part). Modelled as a real 'buy' transaction dated before the earliest of this symbol's
  // sales, so the existing per-symbol running-balance check (D33) — which recomputes balances from
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
    const openingMs = Math.min(baseDate.getTime() - 60 * DAY_MS, earliestSaleMs - DAY_MS)

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
      description: `Sold ${sale.quantity.toLocaleString()} shares ${sale.symbol}`,
      amount: sale.proceeds,
      quantity: sale.quantity,
      price: sale.proceeds / sale.quantity,
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
    date.setDate(date.getDate() - daysAgo)
    const dateStr = date.toISOString()

    const typeRoll = rand()
    if (typeRoll < 0.4 && tradePool.length > 0) {
      // Buy/sell — quantity is resolved below in a chronological second pass (see `trades`),
      // so a trade can never imply a negative running balance for its symbol.
      const side = rand() > 0.5 ? 'buy' : 'sell'
      const pos = tradePool[Math.floor(rand() * tradePool.length)]!
      const rawQty = Math.floor(rand() * 200) + 10
      const fraction = 0.05 + rand() * 0.35
      trades.push({ index: i, date, dateStr, side, pos, rawQty, fraction })
    } else if (typeRoll < 0.6) {
      // Dividend — a plausible quarterly yield (0.2%–0.8%) on the position actually named,
      // rather than an arbitrary fraction of total account value.
      const pos = held[Math.floor(rand() * held.length)]!
      const amount = Math.round(pos.marketValue * (0.002 + rand() * 0.006) * 100) / 100
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: 'dividend', symbol: pos.symbol, description: `Dividend — ${pos.symbol}`, amount,
      })
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
    const qty = boundedTradeQty(cap, trade.rawQty, trade.fraction)
    balances.set(symbol, side === 'buy' ? balance + qty : balance - qty)

    const price = trade.pos.price
    txns.push({
      id: `txn-${accountId}-${trade.index}`, accountId, date: trade.dateStr,
      type: side, symbol, description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} shares ${symbol}`,
      amount: side === 'buy' ? -(qty * price) : qty * price, quantity: qty, price,
    })
  }

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function generateTaxLots(accountId: string, totalValue: number): TaxLot[] {
  const positions = getPositionsForAccount(accountId, totalValue)
  const anchor = startOfToday()
  const lots: TaxLot[] = []

  const account = accounts.find((a) => a.id === accountId)
  // C12 · tax-loss-harvesting — scoped to the whole household, including IRAs and 401(k)s,
  // because a repurchase in any of them triggers §1091 (the "IRA wash-sale trap"). An account
  // that can't be resolved to a household must restrict nothing, not everything — an omitted
  // `householdId` would otherwise widen `openWashSaleWindows` to every household in the firm.
  const restrictedSymbols = new Set(
    account ? openWashSaleWindows(MOCK_TODAY_ISO, account.householdId).map((w) => w.symbol) : [],
  )

  for (const pos of positions) {
    if (pos.symbol === 'CASH') continue
    const rand = seeded(`${accountId}:${pos.id}`)
    const lotCount = 1 + Math.floor(rand() * 3) // 1–3
    const shares = fractions(rand, lotCount)

    // Older lots first, so FIFO and LIFO orderings are meaningful.
    const ages = Array.from({ length: lotCount }, () => 3 + Math.floor(rand() * 45))
      .sort((a, b) => b - a)

    let allocatedQty = 0
    let allocatedBasis = 0
    let allocatedValue = 0
    for (let i = 0; i < lotCount; i++) {
      const isLast = i === lotCount - 1
      const share = shares[i]!
      const purchaseDate = new Date(anchor)
      // UTC, not local: `anchor` is UTC midnight, and local get/set-Month would bake in the
      // host timezone's day-of-month, making the serialised date machine-dependent.
      purchaseDate.setUTCMonth(purchaseDate.getUTCMonth() - ages[i]!)

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
        purchaseDate: purchaseDate.toISOString().slice(0, 10),
        quantity,
        costBasis,
        currentValue,
        gainLoss: currentValue - costBasis,
        // IRC §1222 requires *more than* one year for long-term treatment, so a lot exactly
        // 12 months old is short-term.
        holdingPeriod: ages[i]! > 12 ? 'long' : 'short',
        washSaleRestricted: restrictedSymbols.has(pos.symbol),
      })
    }
  }
  return lots
}

export const custodianHandlers = [
  http.get('/api/custodian/accounts', ({ request }) => {
    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')
    const householdId = url.searchParams.get('householdId')

    let filtered = [...accounts]
    if (clientId) filtered = filtered.filter((a) => a.clientId === clientId)
    if (householdId) filtered = filtered.filter((a) => a.householdId === householdId)

    return HttpResponse.json(filtered)
  }),

  http.get('/api/custodian/accounts/:accountId', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(account)
  }),

  http.get('/api/custodian/accounts/:accountId/balances', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json({
      totalValue: account.totalValue,
      cashBalance: account.cashBalance,
      marginBalance: 0,
    })
  }),

  http.get('/api/custodian/accounts/:accountId/transactions', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(generateTransactions(account.id, account.totalValue))
  }),

  http.get('/api/custodian/accounts/:accountId/tax-lots', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(generateTaxLots(account.id, account.totalValue))
  }),

  http.get('/api/custodian/accounts/:accountId/realised-sales', ({ params }) => {
    const account = accounts.find((a) => a.id === params.accountId)
    if (!account) return notFound()
    return HttpResponse.json(openWashSaleWindows(MOCK_TODAY_ISO, account.householdId))
  }),
]
