import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { generateRebalanceTrades, computeDriftForAccountById } from './liquidity-helpers'
import { isModelManaged } from '@/lib/mandate'

describe('a rebalance never proposes a market sale of a periodic-liquidity fund', () => {
  it('no account in the book proposes a BXPE leg, tax-aware or not', () => {
    for (const a of accounts.filter(isModelManaged)) {
      for (const taxAware of [true, false]) {
        const legs = generateRebalanceTrades(a.id, taxAware)
        expect(legs.filter((l) => l.symbol === 'BXPE'), `${a.id} taxAware=${taxAware}`).toEqual([])
      }
    }
  })

  it('acc-002 still reports its private-equity drift — the holding is visible, just not sold', () => {
    const drift = computeDriftForAccountById('acc-002')
    expect(drift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!.actual).toBeGreaterThan(0)
  })
})
