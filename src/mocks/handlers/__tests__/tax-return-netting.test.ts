import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { previewModelTrades } from '@/services/trading'
import { accounts } from '@/mocks/data/accounts'
import { additionalCapitalGainsTax, netTaxForLegs } from '@/lib/capital-gains'
import { taxRateFor } from '@/lib/tax-rules'
import { taxReturnFor, ytdRealisedOnReturn, sameWashSaleTaxpayer, openWashSaleWindowsFor } from '@/mocks/handlers/tax-return'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { realisedSales, washSaleWindow } from '@/mocks/data/realised-sales'
import { generateTaxLots, washSaleAcquisitions } from '@/mocks/handlers/custodian'

// The MSW server is started for every test file by src/test/setup.ts.
const returnOf = (id: string) => taxReturnFor(accounts.find((a) => a.id === id)!)
const sum = (trades: { realisedShortTerm: number; realisedLongTerm: number; realisedCollectibleLongTerm: number }[]) => ({
  shortTerm: trades.reduce((s, t) => s + t.realisedShortTerm, 0),
  longTerm: trades.reduce((s, t) => s + t.realisedLongTerm, 0),
  collectibleLongTerm: trades.reduce((s, t) => s + t.realisedCollectibleLongTerm, 0),
})

const accountOf = (id: string) => accounts.find((a) => a.id === id)!
const washScope = (id: string) => sameWashSaleTaxpayer(accountOf(id)).map((a) => a.id)

describe('whose purchases can wash whose losses: the §1091 taxpayer, not the household', () => {
  it('an irrevocable trust is its own taxpayer: its purchases wash none of Margaret\'s losses, and hers none of its', () => {
    expect(washScope('acc-006')).toEqual(['acc-006'])
    expect(washScope('acc-007')).not.toContain('acc-006')
  })

  it('the owner\'s and the spouse\'s IRAs and Roths are in scope: a purchase there is the IRA wash-sale trap', () => {
    expect(accountOf('acc-008').taxTreatment).toBe('tax_deferred')
    expect(accountOf('acc-010').taxTreatment).toBe('tax_free')
    expect(washScope('acc-007')).toEqual(expect.arrayContaining(['acc-007', 'acc-008', 'acc-009', 'acc-010', 'acc-041', 'acc-042']))
  })

  it('a spouse counts whether or not the couple files jointly: hh-004 records no joint return, yet is one wash-sale taxpayer', () => {
    // Michael (acc-015) and Jennifer (acc-017) Martinez are on separate returns…
    expect(returnOf('acc-017')).not.toBe(returnOf('acc-015'))
    // …but Jennifer's purchase still washes Michael's loss.
    expect(washScope('acc-015')).toContain('acc-017')
  })

  it('a loss-sale window restricts buys by the same taxpayer only: rs-002 (Margaret, NVDA) binds Elizabeth\'s account, not the trust', () => {
    expect(openWashSaleWindowsFor(accountOf('acc-009'), MOCK_TODAY_ISO).map((w) => w.id)).toContain('rs-002')
    expect(openWashSaleWindowsFor(accountOf('acc-006'), MOCK_TODAY_ISO).map((w) => w.id)).not.toContain('rs-002')
    // rs-003 (Michael Martinez, INTC) binds his spouse's account although they do not file jointly.
    expect(openWashSaleWindowsFor(accountOf('acc-017'), MOCK_TODAY_ISO).map((w) => w.id)).toContain('rs-003')
  })
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

  it('hh-002 files jointly: Margaret Chen\'s accounts, in any currency, and Elizabeth Wong\'s are one return', () => {
    expect(returnOf('acc-007')).not.toBeNull()
    expect(returnOf('acc-009')).toBe(returnOf('acc-007'))
    expect(returnOf('acc-041')).toBe(returnOf('acc-007'))
    expect(returnOf('acc-042')).toBe(returnOf('acc-007'))
  })

  it('spouses with no filing status on file are not assumed to file jointly', () => {
    // hh-013 records no filing status: Hans Mueller (acc-043) and Ingrid Mueller (acc-044).
    expect(returnOf('acc-043')).not.toBeNull()
    expect(returnOf('acc-043')).not.toBe(returnOf('acc-044'))
  })
})

describe('year-to-date realised results on a return', () => {
  it('hh-001\'s joint return carries rs-001, the −$32,750 long-term INTC loss', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-002')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: 0, longTerm: -32_750, collectibleLongTerm: 0 })
  })

  it('the Chen irrevocable trust does not carry Margaret Chen\'s own rs-002 loss', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-006')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: 0, longTerm: 0, collectibleLongTerm: 0 })
    expect(ytdRealisedOnReturn(returnOf('acc-007')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: -28_500, longTerm: 0, collectibleLongTerm: 0 })
  })

  it('Elizabeth Wong\'s acc-009 carries rs-002 from Margaret Chen\'s acc-007: one joint return', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-009')!, MOCK_TODAY_ISO)).toEqual({ shortTerm: -28_500, longTerm: 0, collectibleLongTerm: 0 })
  })

  it('a sale after the as-of date, or in an earlier tax year, is not year-to-date', () => {
    expect(ytdRealisedOnReturn(returnOf('acc-002')!, '2026-02-19')).toEqual({ shortTerm: 0, longTerm: 0, collectibleLongTerm: 0 })
    expect(ytdRealisedOnReturn(returnOf('acc-002')!, '2027-01-05')).toEqual({ shortTerm: 0, longTerm: 0, collectibleLongTerm: 0 })
  })
})

describe('the rebalance estimate is the tax this proposal adds to its return', () => {
  it('acc-002: the proposal\'s +76,538 LT nets against rs-001\'s −32,750 → 43,788 x 23.8% = 10,422', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    expect(preview!.estimatedTaxImpact).toBe(10_422)
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: -32_750, collectibleLongTerm: 0 })
    expect(sum(preview!.trades)).toEqual({ shortTerm: 0, longTerm: 76_538, collectibleLongTerm: 0 })
    expect(preview!.estimatedTaxImpact).toBe(additionalCapitalGainsTax(preview!.ytdRealisedOnReturn!, sum(preview!.trades), taxRateFor))
  })

  it('acc-002 onto mod-002: the model-trade preview states the same figure', async () => {
    const [modelTrade] = await previewModelTrades('mod-002', ['acc-002'])
    expect(modelTrade!.estimatedTaxImpact).toBe(10_422)
    // Model-trade legs carry no realised results, so the pin is paired with the rebalance preview,
    // whose figure is checked against the engine's arithmetic above.
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    expect(modelTrade!.estimatedTaxImpact).toBe(preview!.estimatedTaxImpact)
  })

  it('acc-006 (irrevocable trust): nothing is netted from another taxpayer', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-006'], taxAware: true })
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: 0, collectibleLongTerm: 0 })
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

describe('a recorded loss sale counts at face value only because nothing washed it', () => {
  // `ytdRealisedOnReturn` nets every recorded loss in full. That is right only while no lot of the
  // same symbol was bought by the same taxpayer inside the sale's 61-day window (to date); if one
  // were, part of the loss would be disallowed and the YTD figure overstated.
  it('no recorded loss sale has a replacement bought by the same taxpayer inside its window', () => {
    const losses = realisedSales.filter((sale) => sale.realisedGainLoss < 0)
    expect(losses.length, 'vacuity guard').toBeGreaterThan(0)
    for (const sale of losses) {
      const { start, end } = washSaleWindow(sale.saleDate)
      const through = end < MOCK_TODAY_ISO ? end : MOCK_TODAY_ISO
      const replacements = washSaleAcquisitions(accountOf(sale.accountId), (a) => generateTaxLots(a.id, a.totalValue))
        .filter((a) => a.symbol === sale.symbol && a.date >= start && a.date <= through)
      expect(replacements, sale.id).toEqual([])
    }
  })
})
