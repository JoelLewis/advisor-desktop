import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { realisedSales } from '@/mocks/data/realised-sales'
import { orders } from '@/mocks/handlers/oms'
import { KNOWN_OPEN_DATES, generateTaxLots, generateTransactions, holdingPeriodOn } from '@/mocks/handlers/custodian'
import { isDuringNyseSession, isTradingDay, nyseSessionUtc } from '@/lib/trading-calendar'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'

/**
 * Final review I2 · the Task 14 ruling: every trade the engine records happened on a day the NYSE
 * traded, and every exchange fill in its regular session.
 *
 * Scope, by name: realised sales, the order book, tax-lot purchase dates, recorded open dates and
 * the narrative transactions built from them (opening balances, realised-sale sells, recorded
 * purchases). EXCLUDED: the synthetic custodian transaction history, the 60-day stream of random
 * buys, sells, dividends, interest, fees and transfers `generateTransactions` draws as
 * `txn-<account>-<n>`. It does not yet agree with the lots (review I3), and dating it is deferred
 * with that fix.
 */
const SYNTHETIC_TRANSACTION = /^txn-acc-\d+-\d+$/

function narrativeTransactions() {
  return accounts.flatMap((a) => generateTransactions(a.id, a.totalValue)).filter((t) => !SYNTHETIC_TRANSACTION.test(t.id))
}

describe('I2 · every realised sale is dated on a trading day', () => {
  for (const sale of realisedSales) {
    it(`${sale.id} (${sale.symbol}) sold on ${sale.saleDate}`, () => {
      expect(isTradingDay(sale.saleDate)).toBe(true)
    })
  }
})

describe('I2 · every order is placed on a trading day and every exchange fill lands in the session', () => {
  for (const order of orders) {
    it(`${order.id} (${order.symbol}, ${order.assetClass})`, () => {
      // Digital assets trade every day of the week.
      if (order.assetClass === 'digital_asset') return
      expect(isTradingDay(order.submittedAt), `submitted ${order.submittedAt}`).toBe(true)
      if (order.filledAt === undefined) return
      expect(order.filledAt >= order.submittedAt, 'fills after it is placed').toBe(true)
      expect(Date.parse(order.filledAt)).toBeLessThanOrEqual(Date.parse(MOCK_NOW_ISO))
      if (order.assetClass === 'mutual_fund') {
        // Rule 22c-1: forward pricing at the next NAV, struck at the 4:00 PM ET close.
        expect(Date.parse(order.filledAt), `filled ${order.filledAt}`).toBe(Date.parse(nyseSessionUtc(order.filledAt).close))
      } else {
        expect(isDuringNyseSession(order.filledAt), `filled ${order.filledAt}`).toBe(true)
      }
    })
  }
})

describe('I2 · every tax lot is bought on a trading day and keeps the holding period its date implies', () => {
  it('across every account in the book', () => {
    const lots = accounts.flatMap((a) => generateTaxLots(a.id, a.totalValue))
    expect(lots.length).toBeGreaterThan(0)
    for (const lot of lots) {
      expect(isTradingDay(lot.purchaseDate), `${lot.id} ${lot.purchaseDate}`).toBe(true)
      expect(lot.holdingPeriod, `${lot.id} ${lot.purchaseDate}`).toBe(holdingPeriodOn(lot.purchaseDate, MOCK_TODAY_ISO))
    }
  })
})

describe('I2 · every opening date is a trading day', () => {
  it('the recorded open dates', () => {
    for (const [positionId, date] of KNOWN_OPEN_DATES) expect(isTradingDay(date), `${positionId} ${date}`).toBe(true)
  })

  it('the narrative transactions: opening balances, realised-sale sells and recorded purchases', () => {
    const narrative = narrativeTransactions()
    expect(narrative.some((t) => t.id.includes('-opening-'))).toBe(true)
    for (const t of narrative) expect(isTradingDay(t.date), `${t.id} ${t.date}`).toBe(true)
  })

  it('a position opens on or before its first sale', () => {
    for (const sale of realisedSales) {
      const opening = narrativeTransactions().find((t) => t.id === `txn-${sale.accountId}-opening-${sale.symbol}`)
      expect(opening, `${sale.id} has an opening`).toBeDefined()
      expect(opening!.date.slice(0, 10) <= sale.saleDate, `${opening!.id} ${opening!.date} vs ${sale.saleDate}`).toBe(true)
    }
  })
})
