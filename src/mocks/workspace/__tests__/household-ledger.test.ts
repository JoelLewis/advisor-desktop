import { describe, it, expect } from 'vitest'
import { advanceClockTo } from '@/mocks/data/workspace-store'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { minuteOf } from '@/lib/clock'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { accounts } from '@/mocks/data/accounts'
import { orders } from '@/mocks/handlers/oms'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import type { Order } from '@/services/oms'
import { convertCurrency } from '@/lib/currency'
import {
  accountLedger, householdLedger, ticketValue,
  type AccountLedger, type HouseholdLedger, type LedgerFill, type LedgerSource, type OpenOrder, type QuantityUnit,
} from '../household-ledger'
import { approvedV1, release } from './story-fixture'

const johnson = (): HouseholdLedger => householdLedger('hh-001')
const account = (id: string): AccountLedger => {
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
    expect(account('acc-002').positions.some((p) => p.symbol === 'INTC')).toBe(true)
    release(a)
    expect(johnson().openOrders.filter((o) => o.status === 'pending_compliance')).toEqual([])
    expect(johnson().fillsOnDay.length).toBeGreaterThan(0)
    expect(johnson().fillsOnDay.map((f) => f.id)).toEqual(ledgerFills().map((f) => f.id))
    const robert = accounts.find((x) => x.id === 'acc-002')
    if (!robert) throw new Error('acc-002 exists')
    expect(accountLedger('acc-002').positions).toEqual(getPositionsForAccount('acc-002', robert.totalValue))
    expect(account('acc-002').positions.some((p) => p.symbol === 'INTC')).toBe(false)
  })

  it("reads the session clock's day: after a jump to Thursday, Wednesday's fills are not the day's", () => {
    release(approvedV1())
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    expect(johnson().day).toBe('2026-02-26')
    expect(johnson().fillsOnDay).toEqual([])
    expect(ledgerFills().length).toBeGreaterThan(0)
    expect(householdLedger('hh-001', '2026-02-25').fillsOnDay.length).toBeGreaterThan(0)
    expect(householdLedger('hh-001', '2026-02-25').fillsOnDay.length).toBe(ledgerFills().length)
  })

  it("reads an OMS ticket's fill on the New York day it filled, not the UTC day", () => {
    const ticket: Order = {
      id: 'ord-test-fill', accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 10, orderType: 'market', status: 'filled',
      filledQuantity: 10, filledPrice: 270, submittedAt: '2026-02-26T01:30:00Z', filledAt: '2026-02-26T02:00:00Z', assetClass: 'equity',
    }
    orders.push(ticket)
    try {
      const fill = householdLedger('hh-001', '2026-02-25').fillsOnDay.find((f) => f.id === ticket.id)
      const source: LedgerSource = { kind: 'ticket', orderId: ticket.id }
      const unit: QuantityUnit = 'sh'
      expect(fill).toMatchObject({ accountId: 'acc-001', side: 'buy', quantity: 10, quantityUnit: unit, price: 270, value: 2_700, source })
      const asFill: LedgerFill | undefined = fill
      expect(asFill?.at).toBe('2026-02-26T02:00:00Z')
      expect(householdLedger('hh-001', '2026-02-26').fillsOnDay.some((f) => f.id === ticket.id)).toBe(false)
    } finally {
      orders.splice(orders.indexOf(ticket), 1)
    }
  })

  it("moves the taxpayer's open wash-sale windows with the day", () => {
    expect(householdLedger('hh-001', '2026-02-25').washWindows.map((w) => w.symbol)).toEqual(['INTC'])
    expect(householdLedger('hh-001', '2026-03-23').washWindows).toEqual([])
  })

  it("values a market ticket in a non-USD account in that account's currency", () => {
    const hk = accountLedger('acc-041')
    const symbol = ['VTI', 'SPY', 'BND', 'GLD'].find((s) => usdQuoteFor(s) !== undefined && !hk.positions.some((p) => p.symbol === s))
    const quote = symbol === undefined ? undefined : usdQuoteFor(symbol)
    if (symbol === undefined || quote === undefined) throw new Error('a quoted symbol acc-041 does not hold')
    const ticket: Order = {
      id: 'ord-test-hkd', accountId: 'acc-041', symbol, side: 'buy', quantity: 100, orderType: 'market', status: 'pending',
      filledQuantity: 0, submittedAt: '2026-02-24T21:00:00Z', assetClass: 'equity',
    }
    orders.push(ticket)
    try {
      const open: OpenOrder | undefined = accountLedger('acc-041').openOrders.find((o) => o.id === ticket.id)
      expect(open?.estimatedValue).toBeCloseTo(100 * convertCurrency(quote.price, 'USD', 'HKD', FX_RATES_USD_BASE), 6)
      expect(open?.estimatedValue).toBeGreaterThan(100 * quote.price)
    } finally {
      orders.splice(orders.indexOf(ticket), 1)
    }
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
