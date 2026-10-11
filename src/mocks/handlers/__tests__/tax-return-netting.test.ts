import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { previewModelTrades } from '@/services/trading'
import { accounts } from '@/mocks/data/accounts'
import { additionalCapitalGainsTax, netTaxForLegs } from '@/lib/capital-gains'
import { taxRateFor } from '@/features/portfolios/tax/shared'
import { taxReturnFor, ytdRealisedOnReturn } from '@/mocks/handlers/tax-return'
import { MOCK_TODAY_ISO } from '@/lib/clock'

// The MSW server is started for every test file by src/test/setup.ts.
const returnOf = (id: string) => taxReturnFor(accounts.find((a) => a.id === id)!)
const sum = (trades: { realisedShortTerm: number; realisedLongTerm: number }[]) => ({
  shortTerm: trades.reduce((s, t) => s + t.realisedShortTerm, 0),
  longTerm: trades.reduce((s, t) => s + t.realisedLongTerm, 0),
})

describe('which accounts share a tax return', () => {
  it('hh-001 files jointly: Robert\'s individual, his revocable (grantor) trust and Patricia\'s individual are one return', () => {
    expect(returnOf('acc-002')).not.toBeNull()
    expect(returnOf('acc-001')).toBe(returnOf('acc-002'))
    expect(returnOf('acc-005')).toBe(returnOf('acc-002'))
  })

  it('an IRA or a Roth is on no return — its results are not recognised currently', () => {
    expect(returnOf('acc-003')).toBeNull()
    expect(returnOf('acc-004')).toBeNull()
  })

  it('an irrevocable trust files its own return, apart from its grantor\'s', () => {
    expect(returnOf('acc-006')).not.toBeNull()
    expect(returnOf('acc-006')).not.toBe(returnOf('acc-007'))
  })

  it('spouses with no filing status on file are not assumed to file jointly', () => {
    // hh-002 records no filing status: Margaret Chen (acc-007) and Elizabeth Wong (acc-009).
    expect(returnOf('acc-007')).not.toBe(returnOf('acc-009'))
  })
})

describe('year-to-date realised results on a return', () => {
  it('hh-001\'s joint return carries rs-001, the −$32,750 long-term INTC loss', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-002')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: 0, longTerm: -32_750 })
  })

  it('the Chen irrevocable trust does not carry Margaret Chen\'s own rs-002 loss', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-006')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: 0, longTerm: 0 })
    expect(ytdRealisedOnReturn(returnOf('acc-007')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: -28_500, longTerm: 0 })
  })

  it('a sale after the as-of date, or in an earlier tax year, is not year-to-date', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-002')!, '2026-02-20')).toEqual({ shortTerm: 0, longTerm: 0 })
    expect(ytdRealisedOnReturn(returnOf('acc-002')!, '2027-01-05')).toEqual({ shortTerm: 0, longTerm: 0 })
  })
})

describe('the rebalance estimate is the tax this proposal adds to its return', () => {
  it('acc-002: the proposal\'s +76,538 LT nets against rs-001\'s −32,750 → 43,788 x 23.8% = 10,422', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    expect(preview!.estimatedTaxImpact).toBe(10_422)
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: -32_750 })
  })

  it('acc-002 onto mod-002: the model-trade preview states the same figure', async () => {
    const [modelTrade] = await previewModelTrades('mod-002', ['acc-002'])
    expect(modelTrade!.estimatedTaxImpact).toBe(10_422)
  })

  it('acc-006 (irrevocable trust): nothing is netted from another taxpayer', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-006'], taxAware: true })
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: 0 })
    expect(preview!.estimatedTaxImpact).toBe(netTaxForLegs(preview!.trades, taxRateFor).net)
  })

  it('a tax-deferred account nets nothing and owes nothing', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-003'], taxAware: true })
    expect(preview!.ytdRealisedOnReturn).toBeNull()
    expect(preview!.estimatedTaxImpact).toBe(0)
  })

  it('acc-001 + acc-002 in one batch: the YTD loss is netted once, so the figures sum to the return\'s added tax', async () => {
    const previews = await previewRebalance({ accountIds: ['acc-001', 'acc-002'], taxAware: true })
    const both = sum(previews.flatMap((p) => p.trades))
    const expected = additionalCapitalGainsTax({ shortTerm: 0, longTerm: -32_750 }, both, taxRateFor)
    expect(previews.reduce((s, p) => s + p.estimatedTaxImpact, 0)).toBe(expected)
    // The second preview nets against what the first already realised on the same return.
    expect(previews[1]!.nettedWithAccountIds).toEqual(['acc-001'])
    expect(previews[0]!.nettedWithAccountIds).toEqual([])
  })

  it('the model-trade preview nets a batch the same way, and says which earlier accounts it netted with', async () => {
    const previews = await previewModelTrades('mod-002', ['acc-001', 'acc-002'])
    expect(previews.map((p) => p.nettedWithAccountIds)).toEqual([[], ['acc-001']])
  })
})
