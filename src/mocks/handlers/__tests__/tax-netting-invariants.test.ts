import { describe, it, expect, beforeAll } from 'vitest'
import { previewRebalance, type RebalancePreview } from '@/services/oms'
import { additionalCapitalGainsTax, netTaxForLegs } from '@/lib/capital-gains'
import { taxRateFor } from '@/lib/tax-rules'

// The MSW server is started for every test file by src/test/setup.ts.
let preview: RebalancePreview | undefined
beforeAll(async () => {
  const previews = await previewRebalance('user-001', { accountIds: ['acc-002'], taxAware: true })
  preview = previews[0]
})

describe('the rebalance preview nets realized gains and losses', () => {

  it('the INTC sale realizes a loss', () => {
    const intc = preview!.trades.find((t) => t.symbol === 'INTC' && t.side === 'sell')!
    expect(intc.realizedShortTerm + intc.realizedLongTerm).toBeLessThan(0)
    expect(intc.taxImpact).toBe(0)
  })

  it('estimatedTaxImpact is the tax the summed short- and long-term results add to the return\'s YTD results', () => {
    const st = preview!.trades.reduce((s, t) => s + t.realizedShortTerm, 0)
    const lt = preview!.trades.reduce((s, t) => s + t.realizedLongTerm, 0)
    expect(preview!.estimatedTaxImpact).toBe(additionalCapitalGainsTax(preview!.ytdRealizedOnReturn!, { shortTerm: st, longTerm: lt }, taxRateFor))
  })

  it('netting lowers the bill below the gross per-leg tax when a loss is realized', () => {
    expect(preview!.grossTaxOnGains).toBe(preview!.trades.reduce((s, t) => s + t.taxImpact, 0))
    expect(preview!.estimatedTaxImpact).toBeLessThan(preview!.grossTaxOnGains)
  })

  it('acc-002 figures: the SMH replacement is held, so SPY carries the gain', () => {
    // All four sells are long-term: INTC -45,850, SPY 758 shares 69,411, ETHE 11,569, IBIT 41,408.
    // The proposal alone nets to LT 76,538 x 23.8% = 18,216.04 -> 18,216. On hh-001's joint
    // return it also meets rs-001's −32,750 YTD LT loss: 43,788 x 23.8% = 10,421.54 -> 10,422.
    // Gross = SPY 16,520 + ETHE 2,753 + IBIT 9,855 = 29,128 (the INTC loss leg carries no tax).
    expect(preview!.trades.some((t) => t.symbol === 'SMH')).toBe(false)
    expect(netTaxForLegs(preview!.trades, taxRateFor).net).toBe(18_216)
    expect(preview!.estimatedTaxImpact).toBe(10_422)
    // The pin and the engine's own arithmetic on the same legs must agree, so the pin cannot drift.
    expect(preview!.estimatedTaxImpact)
      .toBe(additionalCapitalGainsTax({ shortTerm: 0, longTerm: -32_750 }, { shortTerm: 0, longTerm: 76_538 }, taxRateFor))
    expect(preview!.trades.reduce((s, t) => s + t.realizedLongTerm, 0)).toBe(76_538)
    expect(preview!.grossTaxOnGains).toBe(29_128)
  })

  it('a buy realizes nothing', () => {
    for (const t of preview!.trades.filter((x) => x.side === 'buy')) {
      expect([t.realizedShortTerm, t.realizedLongTerm]).toEqual([0, 0])
    }
  })
})
