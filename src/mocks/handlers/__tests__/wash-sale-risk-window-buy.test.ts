import { describe, it, expect, vi } from 'vitest'

// Inject an open household loss window on EFA, a symbol acc-002's rebalance BUYS, so the engine's
// wiring is exercised on a leg that really is at risk (no recorded sale in the fixtures gives one).
vi.mock('@/mocks/data/realized-sales', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/realized-sales')>()
  const template = original.realizedSales[0]!
  return {
    ...original,
    openWashSaleWindows: (asOf: string, householdId?: string) => [
      ...original.openWashSaleWindows(asOf, householdId),
      { ...template, symbol: 'EFA', realizedGainLoss: -1_000, start: '2026-02-01', end: '2026-03-31', daysRemaining: 34 },
    ],
  }
})

describe('washSaleRisk reaches the proposed legs from the engine', () => {
  it('a buy of the symbol with an open loss window is flagged; other buys are not', async () => {
    // The test setup already loaded `oms.ts` (through the MSW handlers) against the real windows;
    // reset the module graph so the engine under test is the one bound to the mock above.
    vi.resetModules()
    const { generateRebalanceTrades } = await import('../oms')
    const legs = generateRebalanceTrades('acc-002', true)
    const efaBuy = legs.find((l) => l.symbol === 'EFA' && l.side === 'buy')
    const otherBuys = legs.filter((l) => l.side === 'buy' && l.symbol !== 'EFA')
    expect(efaBuy).toBeDefined()
    expect(efaBuy!.washSaleRisk).toBe(true)
    expect(otherBuys.length).toBeGreaterThan(0)
    expect(otherBuys.every((l) => !l.washSaleRisk)).toBe(true)
  })
})
