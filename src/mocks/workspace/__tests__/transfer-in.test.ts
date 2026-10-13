import { describe, it, expect } from 'vitest'
import { HELD_AWAY_CLOSES } from '@/mocks/data/held-away-closes'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { requireProspect } from '../prospects'
import { closeOf, concentrationOf, transferSummary } from '../transfer-in'
import { profileOf, scoreAnswers } from '../risk-scoring'
import { modelMix } from '../prospect-model'
import { withHerReply } from './prospect-fixture'

describe('her transfer, at the 25 Feb close', () => {
  it('is nothing before her statements are on file', () => {
    expect(transferSummary(requireProspect('prsp-011'))).toBeUndefined()
  })

  it('values each holding at the close and sets in kind against selling it now, at 23.8% long-term', () => {
    const summary = transferSummary(withHerReply())
    expect(summary?.lines.map((l) => [l.symbol, l.securityKind, l.price, l.marketValue, l.unrealised, l.holdingPeriod, l.taxIfSoldNow, l.plan])).toEqual([
      ['SPY', 'fund', 520.3, 1_456_840, 446_840, 'long', 106_347.92, 'in_kind'],
      ['SYK', 'single_name', 390.2, 542_378, 481_378, 'long', 114_567.96, 'in_kind'],
    ])
    expect(summary).toMatchObject({ cash: 100_782, transferValue: 2_100_000, totalAssets: 3_000_000, pricesAsOf: '2026-02-25',
      heldAway: [{ statementId: 'stmt-pell-2', custodian: 'TIAA', accountType: '403b', value: 900_000, rollover: 'asked_about' }] })
  })

  it('names the concentration: the single stock above the single-name limit, as a share of all her assets', () => {
    const summary = transferSummary(withHerReply())
    if (!summary) throw new Error('no summary')
    const c = concentrationOf(summary)
    expect(c).toMatchObject({ symbol: 'SYK', marketValue: 542_378, totalAssets: 3_000_000, unrealised: 481_378, taxIfSoldNow: 114_567.96 })
    expect(c?.weightOfAssets).toBeCloseTo(0.18079, 5)
  })

  it('reads the book\'s quotes, and the held-away table only for what the book does not hold', () => {
    expect(closeOf('SPY').price).toBe(520.3)
    expect(closeOf('SYK').price).toBe(390.2)
    for (const symbol of HELD_AWAY_CLOSES.keys()) expect(usdQuoteFor(symbol), symbol).toBeUndefined()
    expect(() => closeOf('ZZZZ')).toThrow('No 25 Feb close for ZZZZ')
  })
})

describe('her profile', () => {
  it('scores 66: Moderate Aggressive, mapped to Growth', () => {
    expect(profileOf(withHerReply())).toEqual({ score: 66, profileLabel: 'Moderate Aggressive', floor: 56, ceiling: 75, modelId: 'mod-002', modelName: 'Growth' })
  })
  it('refuses answers that skip, repeat or invent an option', () => {
    expect(scoreAnswers([{ questionId: 'rq-01', selectedOption: 0 }])).toEqual({ ok: false, message: 'Answer every question once.' })
    const all = ['rq-01', 'rq-02', 'rq-03', 'rq-04', 'rq-05', 'rq-06', 'rq-07', 'rq-08'].map((questionId) => ({ questionId, selectedOption: 0 }))
    expect(scoreAnswers([...all.slice(0, 7), { questionId: 'rq-08', selectedOption: 9 }])).toEqual({ ok: false, message: 'rq-08 has no option 9.' })
  })
  it('reads Growth as about three quarters in stocks', () => {
    const mix = modelMix('mod-002')
    expect(mix.stocks).toBeCloseTo(0.75, 10)
    expect(mix.bonds).toBeCloseTo(0.15, 10)
    expect(mix.cash).toBeCloseTo(0.03, 10)
    expect(mix.other).toBeCloseTo(0.07, 10)
  })
})
