import { http, HttpResponse } from 'msw'
import type { Transaction } from '@/services/custodian'
import type { TaxLot } from '@/types/portfolio'
import { accounts } from '../data/accounts'
import { getPositionsForAccount } from '../data/positions'
import { notFound } from './utils'
import { startOfToday } from '@/lib/clock'

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

function generateTransactions(accountId: string, totalValue: number): Transaction[] {
  const baseDate = startOfToday()
  const rand = seeded(`txn:${accountId}`)
  const held = getPositionsForAccount(accountId, totalValue).filter((p) => p.symbol !== 'CASH')
  const txns: Transaction[] = []

  // Generate ~20 transactions over the past 60 days
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(rand() * 60)
    const date = new Date(baseDate)
    date.setDate(date.getDate() - daysAgo)
    const dateStr = date.toISOString()

    const typeRoll = rand()
    if (typeRoll < 0.4) {
      // Buy/sell
      const side = rand() > 0.5 ? 'buy' : 'sell'
      const pos = held[Math.floor(rand() * held.length)]!
      const rawQty = Math.floor(rand() * 200) + 10
      // A sell can never exceed the position currently held. Every held position has quantity
      // >= 2, so this floor never produces a bound below 1.
      const qty = side === 'sell' ? Math.max(1, Math.min(rawQty, Math.floor(pos.quantity))) : rawQty
      const price = pos.price
      txns.push({
        id: `txn-${accountId}-${i}`, accountId, date: dateStr,
        type: side, symbol: pos.symbol, description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} shares ${pos.symbol}`,
        amount: side === 'buy' ? -(qty * price) : qty * price, quantity: qty, price,
      })
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

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function generateTaxLots(accountId: string, totalValue: number): TaxLot[] {
  const positions = getPositionsForAccount(accountId, totalValue)
  const anchor = startOfToday()
  const lots: TaxLot[] = []

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
        // Set in Task 14 from the household's realised loss sales.
        washSaleRestricted: false,
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
]
