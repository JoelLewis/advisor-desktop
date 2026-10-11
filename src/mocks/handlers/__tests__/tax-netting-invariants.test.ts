import { describe, it, expect, beforeAll } from 'vitest'
import { previewRebalance, type RebalancePreview } from '@/services/oms'
import { netCapitalGainsTax } from '@/lib/capital-gains'
import { taxRateFor } from '@/features/portfolios/tax/shared'

// The MSW server is started for every test file by src/test/setup.ts.
let preview: RebalancePreview | undefined
beforeAll(async () => {
  const previews = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
  preview = previews[0]
})

describe('the rebalance preview nets realised gains and losses', () => {

  it('the INTC sale realises a loss', () => {
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.realisedShortTerm + intc.realisedLongTerm).toBeLessThan(0)
    expect(intc.taxImpact).toBe(0)
  })

  it('estimatedTaxImpact is the netted tax on summed short- and long-term results', () => {
    const st = preview!.trades.reduce((s, t) => s + t.realisedShortTerm, 0)
    const lt = preview!.trades.reduce((s, t) => s + t.realisedLongTerm, 0)
    expect(preview!.estimatedTaxImpact).toBe(netCapitalGainsTax(st, lt, taxRateFor))
  })

  it('netting lowers the bill below the gross per-leg tax when a loss is realised', () => {
    expect(preview!.grossTaxOnGains).toBe(preview!.trades.reduce((s, t) => s + t.taxImpact, 0))
    expect(preview!.estimatedTaxImpact).toBeLessThan(preview!.grossTaxOnGains)
  })

  it('a buy realises nothing', () => {
    for (const t of preview!.trades.filter((x) => x.side === 'buy')) {
      expect([t.realisedShortTerm, t.realisedLongTerm]).toEqual([0, 0])
    }
  })
})
