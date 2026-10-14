import { describe, it, expect, vi, beforeAll } from 'vitest'
import { lossAllowedNow, lossDeferred, lossDisallowed } from '@/lib/tax-rules'
import type { TaxLot } from '@/types/portfolio'

/**
 * The IRA wash-sale trap (Rev. Rul. 2008-5): a loss washed by a purchase in an IRA or Roth is
 * permanently disallowed — the IRA shares take no basis adjustment — while one washed by a taxable
 * purchase is only deferred into that purchase's basis (§1091(d)).
 *
 * This file gives the Johnson Family Trust (acc-001, Robert Johnson's revocable trust) a 400-share
 * SMH lot at a −21,920 loss, and Patricia Johnson's Roth (acc-004, the spouse's, so the same
 * wash-sale taxpayer) 100 SMH bought on 2026-02-15. acc-002 (Robert's individual account) already
 * bought 180 SMH on 2026-02-20. Treas. Reg. §1.1091-1(c) matches replacements earliest first:
 *
 *   Roth   100 shares, 2026-02-15 → loss shares   1–100 disallowed: −21,920 × 100/400 = −5,480
 *   acc-002 180 shares, 2026-02-20 → loss shares 101–280 deferred:   −21,920 × 180/400 = −9,864
 *   no replacement                  → loss shares 281–400 allowed:    −21,920 × 120/400 = −6,576
 */
const TRUST_SMH = 'pos-test-acc-001-smh'
const ROTH_SMH = 'pos-test-acc-004-smh'

vi.mock('@/mocks/data/positions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/positions')>()
  // The planted holding is part of the book both ways the fixtures reach it: the live read and the seed the lots partition.
  const withPlanted = (read: typeof original.getPositionsForAccount) => (accountId: string, totalValue: number) => {
    const positions = read(accountId, totalValue)
    if (accountId === 'acc-001') {
      return [...positions, {
        id: TRUST_SMH, accountId, symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity' as const,
        quantity: 400, price: 245.20, costBasis: 120_000, marketValue: 98_080, gainLoss: -21_920, gainLossPercent: -18.27, weight: 0,
      }]
    }
    if (accountId === 'acc-004') {
      return [...positions, {
        id: ROTH_SMH, accountId, symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity' as const,
        quantity: 100, price: 245.20, costBasis: 24_520, marketValue: 24_520, gainLoss: 0, gainLossPercent: 0, weight: 0,
      }]
    }
    return positions
  }
  return {
    ...original,
    getPositionsForAccount: withPlanted(original.getPositionsForAccount),
    seedPositionsForAccount: withPlanted(original.seedPositionsForAccount),
  }
})

let trustSmh: TaxLot[]
beforeAll(async () => {
  // The test setup already loaded the handlers against the real modules; rebind them to the mock.
  vi.resetModules()
  const custodian = await import('../custodian')
  // The Roth purchase date is the one fact the position mock cannot carry; the custodian reads
  // it from the same table that dates acc-002's SMH purchase.
  const openDates = custodian.KNOWN_OPEN_DATES as Map<string, string>
  openDates.set(ROTH_SMH, '2026-02-15')
  trustSmh = custodian.generateTaxLotsWithSaleRisk('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
})

describe('a loss washed by an IRA or Roth purchase is permanently disallowed, not deferred', () => {
  it('the Roth\'s 100 shares are matched first and disallowed; acc-002\'s 180 are deferred', () => {
    expect(trustSmh.reduce((s, l) => s + l.quantity, 0)).toBe(400)
    expect(trustSmh.reduce((s, l) => s + l.saleWash.disallowedShares, 0)).toBe(100)
    expect(trustSmh.reduce((s, l) => s + l.saleWash.deferredShares, 0)).toBe(180)
  })

  it('the loss splits by the rule: −5,480 disallowed, −9,864 deferred, −6,576 realized now', () => {
    expect(trustSmh.reduce((s, l) => s + lossDisallowed(l), 0)).toBeCloseTo(-5_480, 6)
    expect(trustSmh.reduce((s, l) => s + lossDeferred(l), 0)).toBeCloseTo(-9_864, 6)
    expect(trustSmh.reduce((s, l) => s + lossAllowedNow(l), 0)).toBeCloseTo(-6_576, 6)
  })
})
