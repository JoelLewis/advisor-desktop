import { describe, it, expect } from 'vitest'
import { netCapitalGainsTax, netTaxForLegs, additionalCapitalGainsTax, taxEstimateDirection, capitalLossUse } from '@/lib/capital-gains'

const rate = (p: 'short' | 'long') => (p === 'short' ? 0.37 : 0.238)

describe('netCapitalGainsTax (IRC §1222 netting)', () => {
  it('taxes each character at its own rate when both are gains', () => {
    expect(netCapitalGainsTax(1_000, 2_000, rate)).toBe(Math.round(370 + 476))
  })
  it('a long-term loss offsets a short-term gain', () => {
    expect(netCapitalGainsTax(10_000, -4_000, rate)).toBe(Math.round(6_000 * 0.37))
  })
  it('a short-term loss offsets a long-term gain', () => {
    expect(netCapitalGainsTax(-3_000, 10_000, rate)).toBe(Math.round(7_000 * 0.238))
  })
  it('a pure harvest (losses only) owes nothing — never a negative tax', () => {
    expect(netCapitalGainsTax(-5_000, -45_850, rate)).toBe(0)
  })
  it('losses larger than gains net to zero tax', () => {
    expect(netCapitalGainsTax(2_000, -9_000, rate)).toBe(0)
  })
})

describe('netCapitalGainsTax with collectibles gain (§1(h)(4)–(5), Schedule D Tax Worksheet)', () => {
  // `longTerm` is the whole long-term result; `collectibleLongTerm` the part of it that is collectibles.
  const withCollectibles = (p: 'short' | 'long', c?: 'capital_asset' | 'collectible') =>
    p === 'short' ? 0.408 : c === 'collectible' ? 0.318 : 0.238
  it('a long-term collectibles gain is taxed at its own rate beside an ordinary long-term gain', () => {
    expect(netCapitalGainsTax(0, 30_000, withCollectibles, 10_000)).toBe(Math.round(10_000 * 0.318 + 20_000 * 0.238))
  })
  it('an ordinary long-term loss offsets the collectibles gain first', () => {
    // other LT −4,000, collectibles +10,000: 6,000 of 28%-group gain remains.
    expect(netCapitalGainsTax(0, 6_000, withCollectibles, 10_000)).toBe(Math.round(6_000 * 0.318))
  })
  it('a collectibles loss offsets ordinary long-term gain', () => {
    expect(netCapitalGainsTax(0, 5_000, withCollectibles, -5_000)).toBe(Math.round(5_000 * 0.238))
  })
  it('a net short-term loss reduces the collectibles gain before the ordinary long-term gain', () => {
    // ST −3,000; LT +20,000 of which collectibles +10,000 → 7,000 at 31.8%, 10,000 at 23.8%.
    expect(netCapitalGainsTax(-3_000, 20_000, withCollectibles, 10_000)).toBe(Math.round(7_000 * 0.318 + 10_000 * 0.238))
  })
  it('a long-term loss overall leaves no collectibles gain to tax', () => {
    expect(netCapitalGainsTax(5_000, -2_000, withCollectibles, 3_000)).toBe(Math.round(3_000 * 0.408))
  })
  it('without collectibles the result is unchanged', () => {
    expect(netCapitalGainsTax(-3_000, 10_000, withCollectibles)).toBe(Math.round(7_000 * 0.238))
  })
})

describe('netTaxForLegs', () => {
  it('nets the legs\' summed results and reports the per-leg gross alongside', () => {
    const legs = [
      { realisedShortTerm: 0, realisedLongTerm: -4_000, taxImpact: 0 },
      { realisedShortTerm: 10_000, realisedLongTerm: 0, taxImpact: 3_700 },
    ]
    expect(netTaxForLegs(legs, rate)).toEqual({ net: Math.round(6_000 * 0.37), gross: 3_700 })
  })
  it('never exceeds gross: the net rounds once, the gross rounds per leg', () => {
    // Each leg's own tax is 1.4 x 0.25 = 0.35, which rounds to 0; the net is 2.8 x 0.25 = 0.7,
    // which rounds to 1. Nothing was netted, so the bill cannot be higher than the gross.
    const legs = [
      { realisedShortTerm: 0, realisedLongTerm: 1.4, taxImpact: 0 },
      { realisedShortTerm: 0, realisedLongTerm: 1.4, taxImpact: 0 },
    ]
    expect(netTaxForLegs(legs, () => 0.25)).toEqual({ net: 0, gross: 0 })
  })
  it('an empty proposal owes nothing', () => {
    expect(netTaxForLegs([], rate)).toEqual({ net: 0, gross: 0 })
  })
})

describe('additionalCapitalGainsTax (a proposal on top of results already realised)', () => {
  const none = { shortTerm: 0, longTerm: 0 }
  it('with nothing realised yet, it is the proposal\'s own netted tax', () => {
    expect(additionalCapitalGainsTax(none, { shortTerm: 1_000, longTerm: 2_000 }, rate)).toBe(netCapitalGainsTax(1_000, 2_000, rate))
  })
  it('a year-to-date long-term loss shelters a proposal\'s long-term gain (acc-002: −32,750 against +76,538)', () => {
    expect(additionalCapitalGainsTax({ shortTerm: 0, longTerm: -32_750 }, { shortTerm: 0, longTerm: 76_538 }, rate))
      .toBe(Math.round(43_788 * 0.238))
  })
  it('a gain can cost more than its own rate when it uses up a loss that was sheltering short-term gains', () => {
    // Before: ST +10,000 sheltered by LT −10,000 → 0. After adding LT +10,000: ST +10,000 → 3,700.
    expect(additionalCapitalGainsTax({ shortTerm: 10_000, longTerm: -10_000 }, { shortTerm: 0, longTerm: 10_000 }, rate)).toBe(3_700)
  })
  it('a loss against gains already realised this year is a negative change — tax saved', () => {
    expect(additionalCapitalGainsTax({ shortTerm: 0, longTerm: 50_000 }, { shortTerm: 0, longTerm: -20_000 }, rate))
      .toBe(Math.round(30_000 * 0.238) - Math.round(50_000 * 0.238))
  })
})

/**
 * The relationship between the return-level estimate and the proposal's own tax on gains
 * (`grossTaxOnGains`), over a grid of signed year-to-date and proposal results. `ownTaxOnGains`
 * is the gross for a proposal of one short- and one long-term leg.
 */
describe('additionalCapitalGainsTax against the proposal\'s own tax on gains', () => {
  const amounts = [-40_000, -10_000, -2_500, 0, 2_500, 10_000, 40_000]
  const results = amounts.flatMap((shortTerm) => amounts.map((longTerm) => ({ shortTerm, longTerm })))
  const ownTaxOnGains = (r: { shortTerm: number; longTerm: number }) =>
    Math.round(Math.max(0, r.shortTerm) * rate('short')) + Math.round(Math.max(0, r.longTerm) * rate('long'))

  it('never exceeds it when the year-to-date results are a gain or nil in both characters (to a dollar of rounding)', () => {
    for (const prior of results.filter((r) => r.shortTerm >= 0 && r.longTerm >= 0)) {
      for (const added of results) {
        expect(additionalCapitalGainsTax(prior, added, rate), JSON.stringify({ prior, added })).toBeLessThanOrEqual(ownTaxOnGains(added) + 1)
      }
    }
  })

  it('can exceed it when a year-to-date loss was sheltering a gain of the other character', () => {
    const exceeding = results.flatMap((prior) => results.filter((added) => additionalCapitalGainsTax(prior, added, rate) > ownTaxOnGains(added) + 1)
      .map((added) => ({ prior, added })))
    expect(exceeding.length).toBeGreaterThan(0)
    for (const { prior } of exceeding) expect(Math.min(prior.shortTerm, prior.longTerm), JSON.stringify(prior)).toBeLessThan(0)
  })

  it('is never below minus the tax the year-to-date results already owe: trades cannot save more than that', () => {
    for (const prior of results) {
      for (const added of results) {
        expect(additionalCapitalGainsTax(prior, added, rate)).toBeGreaterThanOrEqual(-netCapitalGainsTax(prior.shortTerm, prior.longTerm, rate))
      }
    }
  })
})

describe('taxEstimateDirection', () => {
  it('a positive estimate is tax added; a negative one is tax saved, stated unsigned', () => {
    expect(taxEstimateDirection(10_422)).toEqual({ direction: 'added to', amount: 10_422 })
    expect(taxEstimateDirection(-1_755)).toEqual({ direction: 'saved on', amount: 1_755 })
    expect(taxEstimateDirection(0)).toEqual({ direction: 'added to', amount: 0 })
  })
})

describe('capitalLossUse (§1211(b) ordinary-income offset, §1212(b) carryforward)', () => {
  it('a loss beyond the year\'s gains offsets up to the limit of ordinary income and carries the rest forward', () => {
    // +6,260 − 52,400 = −46,140: 3,000 offsets ordinary income, 43,140 carries forward (6,260 + 3,000 + 43,140 = 52,400).
    expect(capitalLossUse(6_260, -52_400, 3_000)).toEqual({ ordinaryIncomeOffset: 3_000, carriedForward: 43_140 })
  })
  it('once the year\'s earlier losses have taken the limit, an added loss only carries forward', () => {
    expect(capitalLossUse(-32_750, -45_850, 3_000)).toEqual({ ordinaryIncomeOffset: 0, carriedForward: 45_850 })
  })
  it('takes only what is left of the limit', () => {
    expect(capitalLossUse(-1_000, -5_000, 3_000)).toEqual({ ordinaryIncomeOffset: 2_000, carriedForward: 3_000 })
    expect(capitalLossUse(-1_000, -5_000, 1_500)).toEqual({ ordinaryIncomeOffset: 500, carriedForward: 4_500 })
  })
  it('a loss the year\'s gains absorb neither offsets ordinary income nor carries forward', () => {
    expect(capitalLossUse(10_000, -4_000, 3_000)).toEqual({ ordinaryIncomeOffset: 0, carriedForward: 0 })
  })
})
