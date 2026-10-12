import { describe, it, expect, vi } from 'vitest'

/**
 * Sell-side §1091 for each lot the harvest scanner lists. No fixture has a loss lot whose sale
 * would wash, so this file gives the Johnson Family Trust (acc-001) an older SMH holding at a
 * loss. acc-002 bought SMH on 2026-02-21 (pos-265), four days before MOCK_TODAY_ISO, in the same
 * household, so selling the trust's SMH at a loss now would be a wash sale. acc-001 is used
 * because its rebalance sells US equity, so the preview's own verdict on the sale is observable.
 */
const TRUST_SMH = 'pos-test-acc-001-smh'

vi.mock('@/mocks/data/positions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/positions')>()
  return {
    ...original,
    getPositionsForAccount: (accountId: string, totalValue: number) => {
      const positions = original.getPositionsForAccount(accountId, totalValue)
      if (accountId !== 'acc-001') return positions
      return [...positions, {
        id: TRUST_SMH, accountId, symbol: 'SMH', name: 'VanEck Semiconductor ETF', assetClass: 'us_equity',
        quantity: 400, price: 245.20, costBasis: 120_000, marketValue: 98_080, gainLoss: -21_920, gainLossPercent: -18.27, weight: 0,
      }]
    },
  }
})

async function engine() {
  // The test setup already loaded the handlers against the real modules; rebind them to the mock.
  vi.resetModules()
  const custodian = await import('../custodian')
  const oms = await import('../oms')
  return { generateTaxLots: custodian.generateTaxLotsWithSaleRisk, generateRebalanceTrades: oms.generateRebalanceTrades }
}

describe('saleWashSaleRisk: would selling this lot now be a wash sale?', () => {
  it('acc-001\'s SMH lots at a loss wash: SMH was bought in the household four days ago', async () => {
    const { generateTaxLots } = await engine()
    const smh = generateTaxLots('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
    expect(smh.length).toBeGreaterThan(0)
    for (const lot of smh) {
      expect(lot.purchaseDate < '2026-01-26', 'the lot itself is not the recent purchase').toBe(true)
      expect(lot.gainLoss).toBeLessThan(0)
      expect(lot.saleWashSaleRisk, lot.id).toBe(true)
    }
  })

  it('acc-002\'s INTC lots do not wash: no INTC was bought in the household in the last 30 days', async () => {
    const { generateTaxLots } = await engine()
    const lots = generateTaxLots('acc-002', 4_500_000)
    expect(lots.some((l) => l.repurchaseBlockedUntil !== null)).toBe(true)
    expect(lots.filter((l) => l.repurchaseBlockedUntil !== null).every((l) => !l.saleWashSaleRisk)).toBe(true)
  })

  it('the SMH replacement lot itself does not wash: selling it disposes of the purchase', async () => {
    const { generateTaxLots } = await engine()
    const replacement = generateTaxLots('acc-002', 4_500_000).filter((l) => l.positionId === 'pos-265')
    expect(replacement.map((l) => l.saleWashSaleRisk)).toEqual([false])
  })

  it('a lot at a gain never washes, whatever was bought', async () => {
    const { generateTaxLots } = await engine()
    for (const id of ['acc-001', 'acc-002', 'acc-005']) {
      const lots = generateTaxLots(id, 1)
      expect(lots.filter((l) => l.gainLoss >= 0).every((l) => !l.saleWashSaleRisk), id).toBe(true)
    }
  })

  it('the scanner\'s flag and the rebalance preview agree on acc-001\'s SMH sale', async () => {
    const { generateTaxLots, generateRebalanceTrades } = await engine()
    const smhSell = generateRebalanceTrades('acc-001', true).find((t) => t.symbol === 'SMH' && t.side === 'sell')
    expect(smhSell, 'vacuity guard — the preview must sell the SMH').toBeDefined()
    expect(smhSell!.realisedShortTerm + smhSell!.realisedLongTerm).toBeLessThan(0)
    const lots = generateTaxLots('acc-001', 8_200_000).filter((l) => l.positionId === TRUST_SMH)
    expect(smhSell!.washSaleRisk).toBe(true)
    expect(lots.every((l) => l.saleWashSaleRisk)).toBe(true)
  })
})
