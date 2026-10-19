import { describe, it, expect, vi } from 'vitest'
import { lossAllowedNow, lossDeferred, lossDisallowed } from '@/lib/tax-rules'

const washesOnSale = (lot: { saleWash: { deferredShares: number; disallowedShares: number } }) =>
  lot.saleWash.deferredShares + lot.saleWash.disallowedShares > 0

/**
 * Sell-side §1091 for each lot the harvest scanner lists. No fixture has a loss lot whose sale
 * would wash, so this file gives the Johnson Family Trust (acc-001, Robert Johnson's revocable
 * trust) an older 400-share SMH holding at a loss. acc-002 (Robert's individual account, so the
 * same taxpayer) bought 180 SMH on 2026-02-20 (pos-265), five days before MOCK_TODAY_ISO.
 *
 * Treas. Reg. §1.1091-1(c): 180 replacement shares wash 180 of the 400 loss shares, not all 400.
 * acc-002 is taxable, so the washed part is deferred into the replacement's basis (§1091(d)).
 * acc-001 is used because its rebalance sells US equity, so the preview's own verdict is observable.
 */
const TRUST_SMH = 'pos-test-acc-001-smh'

vi.mock('@/mocks/data/positions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/positions')>()
  // The planted holding is part of the book both ways the fixtures reach it: the live read and the seed the lots partition.
  const withPlanted = (read: typeof original.getPositionsForAccount) => (accountId: string, totalValue: number) => {
    const positions = read(accountId, totalValue)
    if (accountId !== 'acc-001') return positions
    return [...positions, {
      id: TRUST_SMH, accountId, symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity',
      quantity: 400, price: 245.20, costBasis: 120_000, marketValue: 98_080, gainLoss: -21_920, gainLossPercent: -18.27, weight: 0,
    }]
  }
  return {
    ...original,
    getPositionsForAccount: withPlanted(original.getPositionsForAccount),
    seedPositionsForAccount: withPlanted(original.seedPositionsForAccount),
  }
})

async function engine() {
  // The test setup already loaded the handlers against the real modules; rebind them to the mock.
  vi.resetModules()
  const custodian = await import('../custodian')
  const oms = await import('../oms')
  return { generateTaxLots: custodian.generateTaxLotsWithSaleRisk, generateRebalanceTrades: oms.generateRebalanceTrades }
}

describe('saleWash: how many shares of this lot would a sale today wash?', () => {
  it('acc-001\'s 400-share SMH loss lot washes 180 shares, deferred: acc-002 bought 180 SMH five days ago', async () => {
    const { generateTaxLots } = await engine()
    const [replacement] = generateTaxLots('acc-002', 4_500_000).filter((l) => l.positionId === 'pos-265')
    expect(replacement).toMatchObject({ purchaseDate: '2026-02-20', quantity: 180 })
    const smh = generateTaxLots('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
    expect(smh.reduce((s, l) => s + l.quantity, 0)).toBe(400)
    for (const lot of smh) {
      expect(lot.purchaseDate < '2026-01-26', 'the lot itself is not the recent purchase').toBe(true)
      expect(lot.gainLoss).toBeLessThan(0)
    }
    // min(400 loss shares, 180 replacement shares) = 180 washed, all deferred (taxable replacement).
    expect(smh.reduce((s, l) => s + l.saleWash.deferredShares, 0)).toBe(180)
    expect(smh.reduce((s, l) => s + l.saleWash.disallowedShares, 0)).toBe(0)
  })

  it('only the washed proportion of the loss is held back: 220/400 is realized now, 180/400 deferred', async () => {
    const { generateTaxLots } = await engine()
    const smh = generateTaxLots('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
    // −21,920 × 220/400 = −12,056 allowed now; −21,920 × 180/400 = −9,864 deferred; nothing lost.
    expect(smh.reduce((s, l) => s + lossAllowedNow(l), 0)).toBeCloseTo(-12_056, 6)
    expect(smh.reduce((s, l) => s + lossDeferred(l), 0)).toBeCloseTo(-9_864, 6)
    expect(smh.reduce((s, l) => s + lossDisallowed(l), 0)).toBe(0)
  })

  it('acc-002\'s INTC lots do not wash: no INTC was bought by the taxpayer in the last 30 days', async () => {
    const { generateTaxLots } = await engine()
    const lots = generateTaxLots('acc-002', 4_500_000)
    expect(lots.some((l) => l.repurchaseBlockedUntil !== null)).toBe(true)
    expect(lots.filter((l) => l.repurchaseBlockedUntil !== null).every((l) => !washesOnSale(l))).toBe(true)
  })

  it('the SMH replacement lot itself does not wash: selling it disposes of the purchase', async () => {
    const { generateTaxLots } = await engine()
    const replacement = generateTaxLots('acc-002', 4_500_000).filter((l) => l.positionId === 'pos-265')
    expect(replacement.map((l) => l.saleWash)).toEqual([{ deferredShares: 0, disallowedShares: 0 }])
  })

  it('a lot at a gain never washes, whatever was bought', async () => {
    const { generateTaxLots } = await engine()
    for (const [id, value] of [['acc-001', 8_200_000], ['acc-002', 4_500_000], ['acc-005', 2_050_000]] as const) {
      const lots = generateTaxLots(id, value)
      expect(lots.some((l) => l.gainLoss >= 0), `vacuity guard — ${id} has a lot at a gain`).toBe(true)
      expect(lots.filter((l) => l.gainLoss >= 0).every((l) => !washesOnSale(l)), id).toBe(true)
    }
  })

  it('the scanner and the rebalance preview agree acc-001\'s SMH sale washes', async () => {
    const { generateTaxLots, generateRebalanceTrades } = await engine()
    const smhSell = generateRebalanceTrades('acc-001', true).find((t) => t.symbol === 'SMH' && t.side === 'sell')
    expect(smhSell, 'vacuity guard — the preview must sell the SMH').toBeDefined()
    expect(smhSell!.realizedShortTerm + smhSell!.realizedLongTerm).toBeLessThan(0)
    const lots = generateTaxLots('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
    expect(smhSell!.washSaleRisk).toBe(true)
    expect(lots.some(washesOnSale)).toBe(true)
  })

  it('an unknown account is an error, not a book of lots that never wash', async () => {
    const { generateTaxLots } = await engine()
    expect(() => generateTaxLots('acc-does-not-exist', 1)).toThrow(/acc-does-not-exist/)
  })
})
