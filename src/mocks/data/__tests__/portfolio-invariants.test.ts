import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { allPositions, getPositionsForAccount } from '@/mocks/data/positions'

describe('Portfolio Invariants', () => {
  describe('Position-level math (explicit positions)', () => {
    it('allPositions contains 140 explicit positions (17 accounts)', () => {
      expect(allPositions).toHaveLength(140)
    })

    it.each(allPositions.map((p) => [p.id, p.symbol, p]))(
      '%s (%s): marketValue === quantity * price',
      (_id, _symbol, position) => {
        const expected = position.quantity * position.price
        expect(position.marketValue).toBeCloseTo(expected, 0)
      },
    )

    it.each(allPositions.map((p) => [p.id, p.symbol, p]))(
      '%s (%s): gainLoss === marketValue - costBasis',
      (_id, _symbol, position) => {
        const expected = position.marketValue - position.costBasis
        expect(position.gainLoss).toBeCloseTo(expected, 0)
      },
    )

    it.each(
      allPositions
        .filter((p) => p.costBasis > 0)
        .map((p) => [p.id, p.symbol, p]),
    )(
      '%s (%s): gainLossPercent approximates gainLoss / costBasis',
      (_id, _symbol, position) => {
        const expected = position.gainLoss / position.costBasis
        expect(Math.abs(position.gainLossPercent - expected)).toBeLessThan(0.001)
      },
    )

    it('CASH positions have zero gainLoss', () => {
      const cashPositions = allPositions.filter((p) => p.symbol === 'CASH')
      expect(cashPositions.length).toBeGreaterThan(0)
      for (const p of cashPositions) {
        expect(p.gainLoss).toBe(0)
        expect(p.gainLossPercent).toBe(0)
      }
    })
  })

  describe('Account-level position totals', () => {
    it('acc-001 positions sum to approximately $8,200,000 (within 1%)', () => {
      const positions = allPositions.filter((p) => p.accountId === 'acc-001')
      const total = positions.reduce((sum, p) => sum + p.marketValue, 0)
      expect(Math.abs(total - 8_200_000) / 8_200_000).toBeLessThan(0.01)
    })

    it('acc-002 positions sum to approximately $4,500,000 (within 10% — growth-tilt account with volatile assets)', () => {
      const positions = allPositions.filter((p) => p.accountId === 'acc-002')
      const total = positions.reduce((sum, p) => sum + p.marketValue, 0)
      const target = 4_500_000
      expect(Math.abs(total - target) / target).toBeLessThan(0.1)
    })
  })

  // Task 10 — `allPositions` no longer stores a weight, so this block reads the served position
  // through `getPositionsForAccount`, which derives it. The original ±0.02 band was sized for the
  // hand-typed three-decimal weights it used to check; derived weights sum to 1 to float precision,
  // and the tight form of this assertion now lives in position-weight-invariants.test.ts. The loose
  // band is kept here only so this file still fails if the derivation is ever unwired.
  describe('Weight consistency', () => {
    const accountIds = [...new Set(allPositions.map((p) => p.accountId))]

    it('covers every account that carries explicit positions', () => {
      expect(accountIds).toHaveLength(17)
    })

    it.each(accountIds)(
      'account %s: position weights sum to approximately 1.0 (within 0.02)',
      (accountId) => {
        const account = accounts.find((a) => a.id === accountId)
        expect(account, `no account fixture for ${accountId}`).toBeDefined()
        const positions = getPositionsForAccount(accountId, account!.totalValue)
        expect(positions.length, `${accountId} served no positions`).toBeGreaterThan(0)
        const weightSum = positions.reduce((sum, p) => sum + p.weight, 0)
        expect(Math.abs(weightSum - 1.0)).toBeLessThan(0.02)
      },
    )
  })

  // Household AUM consistency now lives in rollup-invariants.test.ts, which asserts the
  // FX-applied identity for every household. D1 · reconciliation.

  describe('getPositionsForAccount', () => {
    it('returns explicit positions for acc-001', () => {
      const positions = getPositionsForAccount('acc-001', 8_200_000)
      expect(positions.every((p) => p.accountId === 'acc-001')).toBe(true)
      expect(positions.length).toBe(12)
    })

    it('generates positions for accounts without explicit data', () => {
      const positions = getPositionsForAccount('acc-010', 1_800_000)
      expect(positions.length).toBe(7)
      expect(positions.every((p) => p.accountId === 'acc-010')).toBe(true)
      expect(positions.some((p) => p.symbol === 'CASH')).toBe(true)
    })

    it('returns explicit positions for acc-011 (now enriched)', () => {
      const positions = getPositionsForAccount('acc-011', 2_800_000)
      expect(positions.length).toBe(10)
      expect(positions.every((p) => p.accountId === 'acc-011')).toBe(true)
      expect(positions.some((p) => p.symbol === 'NVDA')).toBe(true)
    })
  })
})
