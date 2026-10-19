import { describe, it, expect } from 'vitest'
import { advanceClockTo } from '@/mocks/data/workspace-store'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { minuteOf } from '@/lib/clock'
import { accountLedger, householdLedger, ticketValue } from '../household-ledger'
import { approvedV1, release } from './story-fixture'

const johnson = () => householdLedger('hh-001')
const account = (id: string) => {
  const found = johnson().accounts.find((a) => a.account.id === id)
  if (!found) throw new Error(`no ${id} in the Johnson ledger`)
  return found
}

describe('the household ledger', () => {
  it("holds the Johnsons' five accounts and their two held-away plans", () => {
    expect(johnson().accounts.map((a) => a.account.id)).toEqual(['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005'])
    expect(johnson().heldAway.map((h) => h.id)).toEqual(['ha-001', 'ha-002'])
  })

  it('holds every position with the lots that make it up; SMH is the one lot bought on 20 Feb', () => {
    for (const a of johnson().accounts) {
      for (const p of a.positions.filter((x) => x.symbol !== 'CASH')) {
        const shares = a.lots.filter((l) => l.positionId === p.id).reduce((s, l) => s + l.quantity, 0)
        expect(shares, `${a.account.id} ${p.symbol}`).toBeCloseTo(p.quantity, 6)
      }
    }
    const robert = account('acc-002')
    const smh = robert.positions.find((p) => p.symbol === 'SMH')
    if (!smh) throw new Error('acc-002 holds SMH')
    expect(robert.lots.filter((l) => l.positionId === smh.id).map((l) => [l.purchaseDate, l.quantity])).toEqual([['2026-02-20', 180]])
  })

  it('names the working tickets, valued at their limits, with the asset class each changes', () => {
    expect(johnson().openOrders.map((o) => [o.id, o.accountId, o.side, o.symbol, o.quantity, o.status, o.assetClass, o.estimatedValue, o.limitPrice])).toEqual([
      ['ord-003', 'acc-001', 'sell', 'NVDA', 25, 'working', 'us_equity', 19_625, 785],
      ['ord-005', 'acc-002', 'buy', 'QQQ', 200, 'working', 'us_equity', 96_000, 480],
    ])
  })

  it('has no fills today before the release: the tickets filled on earlier days', () => {
    expect(johnson().day).toBe('2026-02-25')
    expect(johnson().fillsOnDay).toEqual([])
  })

  it("states the household's realized sales and the taxpayer's open windows", () => {
    expect(johnson().realizedSales.map((s) => s.id)).toEqual(['rs-001'])
    expect(johnson().washWindows.map((w) => [w.symbol, w.end])).toEqual([['INTC', '2026-03-22']])
  })

  it("sums every account's cash, in USD", () => {
    const l = johnson()
    expect(l.cashUsd).toBeCloseTo(l.accounts.reduce((s, a) => s + a.cash, 0), 2)
    expect(account('acc-002').cash).toBe(225_504)
  })

  it("counts an approved version's orders as pending compliance release, then its fills as today's", () => {
    const a = approvedV1()
    const pending = johnson().openOrders.filter((o) => o.status === 'pending_compliance')
    expect(pending.length).toBeGreaterThan(0)
    for (const o of pending) expect(o.source).toMatchObject({ kind: 'proposal', proposalId: a.proposalId, version: 1 })
    release(a)
    expect(johnson().openOrders.filter((o) => o.status === 'pending_compliance')).toEqual([])
    expect(johnson().fillsOnDay.map((f) => f.id)).toEqual(ledgerFills().map((f) => f.id))
    expect(account('acc-002').positions.some((p) => p.symbol === 'INTC')).toBe(false)
  })

  it("reads the session clock's day: after a jump to Thursday, Wednesday's fills are not the day's", () => {
    release(approvedV1())
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    expect(johnson().day).toBe('2026-02-26')
    expect(johnson().fillsOnDay).toEqual([])
    expect(householdLedger('hh-001', '2026-02-25').fillsOnDay.length).toBe(ledgerFills().length)
  })

  it('refuses an account or a household it does not know', () => {
    expect(() => accountLedger('acc-999')).toThrow('No account acc-999')
    expect(() => householdLedger('hh-999')).toThrow('No household hh-999')
  })
})

describe('ticketValue', () => {
  const filled = { id: 'ord-x', accountId: 'acc-001', side: 'buy', orderType: 'market', status: 'filled', submittedAt: '2026-02-24T15:00:00Z', filledAt: '2026-02-24T21:00:00Z' } as const
  it('values a filled ticket by what it is: a fund by its shares, a bond on par, an option by its multiplier', () => {
    expect(ticketValue({ ...filled, symbol: 'VFIAX', quantity: 53.72647, filledQuantity: 53.72647, filledPrice: 465.32, assetClass: 'mutual_fund' })).toBeCloseTo(25_000, 2)
    expect(ticketValue({ ...filled, symbol: 'UST-10Y', quantity: 50, filledQuantity: 50, filledPrice: 95.2, assetClass: 'fixed_income', parAmount: 50_000 })).toBeCloseTo(47_600, 6)
    expect(ticketValue({ ...filled, symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, filledQuantity: 5, filledPrice: 8.5, assetClass: 'option', contractMultiplier: 100 })).toBeCloseTo(4_250, 6)
  })
  it('has no value for a ticket that did not fill', () => {
    expect(ticketValue({ ...filled, status: 'canceled', symbol: 'VNQ', quantity: 200, filledQuantity: 0, assetClass: 'equity' })).toBeUndefined()
  })
})
