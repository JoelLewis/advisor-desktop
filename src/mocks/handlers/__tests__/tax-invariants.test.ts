import { describe, it, expect } from 'vitest'
import { getTaxLots, getTransactions } from '@/services/custodian'
import { getPositions } from '@/services/pms'
import { MOCK_TODAY_ISO } from '@/lib/clock'

const ACCOUNTS = ['acc-001', 'acc-002', 'acc-011', 'acc-020', 'acc-029', 'acc-041', 'acc-042', 'acc-043', 'acc-044']

describe('tax lots partition their positions', () => {
  it.each(ACCOUNTS)('%s: lots sum to their position on every dimension', async (accountId) => {
    const [lots, positions] = await Promise.all([getTaxLots(accountId), getPositions(accountId)])
    for (const position of positions.filter((p) => p.symbol !== 'CASH')) {
      const forPosition = lots.filter((l) => l.positionId === position.id)
      expect(forPosition.length, `${position.symbol} has no lots`).toBeGreaterThan(0)
      expect(forPosition.reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(position.quantity, 6)
      expect(forPosition.reduce((s, l) => s + l.costBasis, 0)).toBeCloseTo(position.costBasis, 0)
      expect(forPosition.reduce((s, l) => s + l.currentValue, 0)).toBeCloseTo(position.marketValue, 0)
      expect(forPosition.reduce((s, l) => s + l.gainLoss, 0)).toBeCloseTo(position.gainLoss, 0)
    }
  })

  it('C12: lots are deterministic across calls', async () => {
    const first = await getTaxLots('acc-001')
    const second = await getTaxLots('acc-001')
    expect(second).toEqual(first)
  })

  it('C12: gainLoss === currentValue − costBasis for every lot', async () => {
    const lots = await getTaxLots('acc-002')
    for (const lot of lots) {
      expect(lot.gainLoss).toBeCloseTo(lot.currentValue - lot.costBasis, 0)
    }
  })

  it('C12: holdingPeriod follows the purchase date against the clock', async () => {
    const lots = await getTaxLots('acc-001')
    for (const lot of lots) {
      const months = (new Date(MOCK_TODAY_ISO).getTime() - new Date(lot.purchaseDate).getTime())
        / (1000 * 60 * 60 * 24 * 365.25 / 12)
      expect(lot.holdingPeriod).toBe(months > 12 ? 'long' : 'short')
    }
  })

  it('D33: transactions are deterministic and priced consistently with the position', async () => {
    const first = await getTransactions('acc-001')
    const second = await getTransactions('acc-001')
    expect(second).toEqual(first)
    for (const txn of first.filter((t) => t.type === 'buy' || t.type === 'sell')) {
      expect(txn.price).toBeGreaterThan(0)
      expect(Math.abs(txn.amount)).toBeCloseTo(txn.quantity! * txn.price!, 0)
    }
  })
})
