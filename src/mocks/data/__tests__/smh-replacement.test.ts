import { describe, it, expect } from 'vitest'
import { accounts } from '../accounts'
import { getPositionsForAccount } from '../positions'
import { generateTaxLots } from '@/mocks/handlers/custodian'

const acc = accounts.find((a) => a.id === 'acc-002')!

describe('acc-002 holds the SMH bought on 2026-02-21 as the INTC replacement', () => {
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
    expect(lots[0]).toMatchObject({ purchaseDate: '2026-02-21', quantity: 180, holdingPeriod: 'short', gainLoss: 0 })
  })
})
