import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TaxLot } from '@/types/portfolio'

/**
 * Sell-side §1091 through the engine. No fixture today gives a loss sale with a replacement bought
 * inside 30 days, so each scenario edits the household's lots (and, where needed, positions) at
 * the module boundary the engine reads them from, then rebuilds acc-002's proposal. acc-002 sells
 * its whole INTC position (7,000 shares, a $45,850 loss) in every scenario.
 */
type Scenario = 'roth-buys-intc' | 'own-recent-lot' | 'orphan-lot'
const scenario = vi.hoisted(() => ({ current: 'roth-buys-intc' as Scenario }))

const ROTH_INTC = 'pos-test-acc-004-intc'

vi.mock('@/mocks/data/positions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/positions')>()
  return {
    ...original,
    getPositionsForAccount: (accountId: string, totalValue: number) => {
      const positions = original.getPositionsForAccount(accountId, totalValue)
      if (scenario.current !== 'roth-buys-intc' || accountId !== 'acc-004') return positions
      return [...positions, {
        id: ROTH_INTC, accountId, symbol: 'INTC', name: 'Intel Corp.', assetClass: 'us_equity',
        quantity: 100, price: 28.45, costBasis: 2_845, marketValue: 2_845, gainLoss: 0, gainLossPercent: 0, weight: 0,
      }]
    },
  }
})

vi.mock('@/mocks/handlers/custodian', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/handlers/custodian')>()
  const splitWithRecentLot = (lot: TaxLot): TaxLot[] => {
    const recentShare = 2_000 / lot.quantity
    const recent: TaxLot = {
      ...lot,
      id: `${lot.id}-recent`,
      purchaseDate: '2026-02-15',
      quantity: 2_000,
      costBasis: Math.round(lot.costBasis * recentShare),
      currentValue: Math.round(lot.currentValue * recentShare),
      holdingPeriod: 'short',
    }
    recent.gainLoss = recent.currentValue - recent.costBasis
    const older: TaxLot = {
      ...lot,
      quantity: lot.quantity - recent.quantity,
      costBasis: lot.costBasis - recent.costBasis,
      currentValue: lot.currentValue - recent.currentValue,
    }
    older.gainLoss = older.currentValue - older.costBasis
    return [older, recent]
  }
  return {
    ...original,
    generateTaxLots: (accountId: string, totalValue: number): TaxLot[] => {
      const lots = original.generateTaxLots(accountId, totalValue)
      if (scenario.current === 'roth-buys-intc' && accountId === 'acc-004') {
        // A Roth repurchase is the "IRA wash-sale trap": it disallows the taxable account's loss.
        return lots.map((l) => (l.positionId === ROTH_INTC ? { ...l, purchaseDate: '2026-02-15' } : l))
      }
      if (scenario.current === 'own-recent-lot' && accountId === 'acc-002') {
        return lots.flatMap((l) => (l.positionId === 'pos-023' ? splitWithRecentLot(l) : [l]))
      }
      if (scenario.current === 'orphan-lot' && accountId === 'acc-004') {
        return [...lots, { ...lots[0]!, id: 'lot-orphan', positionId: 'pos-does-not-exist' }]
      }
      return lots
    },
  }
})

async function acc002Legs() {
  // The test setup already loaded `oms.ts` (through the MSW handlers) against the real modules;
  // reset the graph so the engine under test is bound to the mocks above.
  vi.resetModules()
  const { generateRebalanceTrades } = await import('../oms')
  return generateRebalanceTrades('acc-002', true)
}

describe('washSaleRisk on a loss-realising sell, from the engine', () => {
  beforeEach(() => { scenario.current = 'roth-buys-intc' })

  it('INTC sold at a loss with INTC bought in the household Roth 10 days earlier is at risk', async () => {
    const legs = await acc002Legs()
    const intc = legs.find((l) => l.symbol === 'INTC' && l.side === 'sell')
    expect(intc).toBeDefined()
    expect(intc!.realisedShortTerm + intc!.realisedLongTerm).toBeLessThan(0)
    expect(intc!.washSaleRisk).toBe(true)
    // The flag is specific to the symbol: gain legs in the same proposal are not touched by it.
    expect(legs.filter((l) => l.side === 'sell' && l.symbol !== 'INTC').every((l) => !l.washSaleRisk)).toBe(true)
  })

  it('a recent lot the sale itself disposes of is not a replacement: no risk', async () => {
    scenario.current = 'own-recent-lot'
    const legs = await acc002Legs()
    const intc = legs.find((l) => l.symbol === 'INTC' && l.side === 'sell')
    expect(intc).toBeDefined()
    // The whole position goes, so both lots — including the one bought 2026-02-15 — are sold.
    expect(intc!.quantity).toBe(7_000)
    expect(intc!.realisedShortTerm + intc!.realisedLongTerm).toBeLessThan(0)
    expect(intc!.washSaleRisk).toBe(false)
  })

  it('a household lot whose position cannot be found is an error, not an acquisition of symbol ""', async () => {
    scenario.current = 'orphan-lot'
    await expect(acc002Legs()).rejects.toThrow(/pos-does-not-exist/)
  })
})
