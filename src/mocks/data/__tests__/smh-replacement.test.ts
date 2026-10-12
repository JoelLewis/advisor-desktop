import { describe, it, expect } from 'vitest'
import { accounts } from '../accounts'
import { getPositionsForAccount } from '../positions'
import { generateTaxLots, generateTransactions, holdingPeriodOn } from '@/mocks/handlers/custodian'
import { MOCK_TODAY_ISO } from '@/lib/clock'

const acc = accounts.find((a) => a.id === 'acc-002')!

describe('acc-002 holds the SMH bought on 2026-02-20 as the INTC replacement', () => {
  const positions = getPositionsForAccount(acc.id, acc.totalValue)
  const smh = positions.find((p) => p.symbol === 'SMH')

  it('holds 180 SMH at $245.20', () => {
    expect(smh).toMatchObject({ quantity: 180, price: 245.2, marketValue: 44_136, costBasis: 44_136 })
  })

  it('was funded from cash: positions still sum to the account value, and cash matches cashBalance', () => {
    const sum = positions.reduce((s, p) => s + p.marketValue, 0)
    expect(sum).toBeCloseTo(acc.totalValue, 0)
    expect(positions.find((p) => p.symbol === 'CASH')!.marketValue).toBe(acc.cashBalance)
    expect(acc.cashBalance).toBe(225_504)
  })

  it('has exactly one lot, dated the purchase day, short-term', () => {
    const lots = generateTaxLots(acc.id, acc.totalValue).filter((l) => l.positionId === smh!.id)
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({ purchaseDate: '2026-02-20', quantity: 180, holdingPeriod: 'short', gainLoss: 0 })
  })
})

describe('acc-002 transaction history records the SMH purchase, and nothing in SMH before it', () => {
  const smhTxns = generateTransactions(acc.id, acc.totalValue).filter((t) => t.symbol === 'SMH')

  it('has exactly one SMH transaction: the 2026-02-20 buy of 180 at $245.20 for $44,136', () => {
    expect(smhTxns).toHaveLength(1)
    expect(smhTxns[0]).toMatchObject({ type: 'buy', quantity: 180, price: 245.2, amount: -44_136 })
    expect(smhTxns[0]!.date.slice(0, 10)).toBe('2026-02-20')
  })

  it('no SMH dividend or trade is dated before the position was opened', () => {
    expect(smhTxns.filter((t) => t.date.slice(0, 10) < '2026-02-20')).toEqual([])
  })
})

describe('holdingPeriodOn: IRC §1222 long-term means held more than one year', () => {
  it('exactly one year is short-term; a day more is long-term', () => {
    expect(holdingPeriodOn('2025-02-25', '2026-02-25')).toBe('short')
    expect(holdingPeriodOn('2025-02-24', '2026-02-25')).toBe('long')
    expect(holdingPeriodOn('2026-02-20', '2026-02-25')).toBe('short')
  })

  it('every acc-002 lot, synthetic or known-date, carries the holding period its own date implies', () => {
    for (const lot of generateTaxLots(acc.id, acc.totalValue)) {
      expect(lot.holdingPeriod, lot.id).toBe(holdingPeriodOn(lot.purchaseDate, MOCK_TODAY_ISO))
    }
  })
})
