import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { riskProfileFor } from '@/mocks/handlers/pms'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { getConcentration, getFactorExposures, getRiskMetrics, getStressScenarios } from '@/services/pms'
import { ASSET_CLASS_RISK, assetClassBeta, portfolioBeta } from '@/lib/risk-model'
import { modelVolatility } from '../models'
import { FACTORS, factorRows, loadingOf } from '../factors'
import { accountRiskView, bookRiskView, riskQuote } from '../risk'
import { riskScoreOf } from '../risk-score'

const ASSET_CLASSES = Object.keys(ASSET_CLASS_RISK)
const risk = (accountId: string) => {
  const v = accountRiskView('user-001', accountId)
  if (!v) throw new Error(`no risk for ${accountId}`)
  return v
}
const vector = (accountId: string) => risk(accountId).factors.map((f) => f.exposure)

describe('factor exposures', () => {
  it('a loading for every asset class and every factor; the market loading is the class beta', () => {
    expect(FACTORS.map((f) => f.id)).toEqual(['market', 'size', 'value', 'momentum', 'quality', 'rates', 'credit'])
    for (const ac of ASSET_CLASSES) {
      for (const f of FACTORS) expect(Number.isFinite(loadingOf(ac, f.id)), `${ac} ${f.id}`).toBe(true)
      expect(loadingOf(ac, 'market'), ac).toBe(assetClassBeta(ac))
    }
    expect(() => loadingOf('collectibles', 'size')).toThrow('collectibles')
  })

  it("are each account's weights times the loadings; the market exposure is its beta", () => {
    for (const a of accounts) {
      const p = riskProfileFor(a)
      const rows = factorRows(p.weights, p.benchWeights)
      expect(rows.find((r) => r.factor === 'market')?.exposure, a.id).toBeCloseTo(portfolioBeta(p.weights), 12)
      for (const r of rows) {
        expect(r.exposure, `${a.id} ${r.factor}`).toBeCloseTo([...p.weights].reduce((s, [ac, w]) => s + w * loadingOf(ac, r.factor), 0), 12)
        expect(r.benchmark, `${a.id} ${r.factor}`).toBeCloseTo([...p.benchWeights].reduce((s, [ac, w]) => s + w * loadingOf(ac, r.factor), 0), 12)
        expect(r.active, `${a.id} ${r.factor}`).toBeCloseTo(r.exposure - r.benchmark, 12)
      }
    }
  })

  it('no two accounts share a factor vector unless their holdings match by asset class', () => {
    const rows = accounts.map((a) => {
      const p = riskProfileFor(a)
      return { id: a.id, weights: JSON.stringify([...p.weights].sort().map(([ac, w]) => [ac, w.toFixed(9)])), factors: factorRows(p.weights, p.benchWeights).map((f) => f.exposure) }
    })
    rows.forEach((a, i) => rows.slice(i + 1).forEach((b) => {
      const differs = a.factors.some((x, k) => Math.abs(x - (b.factors[k] ?? Number.NaN)) > 1e-9)
      expect(differs, `${a.id} vs ${b.id}`).toBe(a.weights !== b.weights)
    }))
  })

  it('the legacy factors endpoint reads the same engine, per account', async () => {
    const [growth, ira] = await Promise.all([getFactorExposures('acc-002'), getFactorExposures('acc-020')])
    expect(growth.map((f) => f.exposure)).toEqual(vector('acc-002'))
    expect(growth.map((f) => f.exposure)).not.toEqual(ira.map((f) => f.exposure))
  })
})

describe('the risk score against the client tolerance', () => {
  it("puts each band's model at the band's midpoint, zero at zero, and caps at one hundred", () => {
    expect(['mod-003', 'mod-007', 'mod-001', 'mod-002', 'mod-004'].map((m) => riskScoreOf(modelVolatility(m)))).toEqual([13, 33, 48, 66, 88])
    expect(riskScoreOf(0)).toBe(0)
    expect(riskScoreOf(1)).toBe(100)
    const grid = Array.from({ length: 50 }, (_, i) => riskScoreOf(i / 100))
    for (let i = 1; i < grid.length; i++) expect(grid[i]).toBeGreaterThanOrEqual(grid[i - 1] ?? 0)
  })

  it('reads the tolerance from the client questionnaire and compares bands', () => {
    const crypto = risk('acc-045')
    const raj = clients.find((c) => c.id === 'cli-011')
    // Raj scores 55, the Moderate band (41–55): the account is 45 points past its ceiling, not 45 past "55".
    expect(crypto.posture).toMatchObject({ score: 100, band: 'Aggressive', status: 'above', beyond: 45 })
    expect(crypto.posture.tolerance).toMatchObject({ clientId: 'cli-011', clientName: raj?.fullName, band: 'Moderate', floor: 41, ceiling: 55, assessedOn: raj?.riskProfile.lastAssessed })
    expect(risk('acc-020').posture.status).toBe('below')
  })
})

describe('account risk', () => {
  it('VaR is parametric, normal, one month, 95%: the legacy figure, from the same σ', async () => {
    for (const id of ['acc-001', 'acc-002', 'acc-045']) {
      const v = risk(id)
      expect(v.var95.value, id).toBe(Math.round(v.value * 1.645 * v.volatility * Math.sqrt(1 / 12)))
      expect(v.var95.percent, id).toBeCloseTo(v.var95.value / v.value, 12)
      expect(v.var95).toMatchObject({ horizon: 'one month', confidence: 0.95, method: 'parametric normal' })
      expect(v.var95.value, id).toBe((await getRiskMetrics(id)).var95)
    }
  })

  it('stress tests replay each scenario on today\'s holdings; concentration is the legacy HHI', async () => {
    const v = risk('acc-001')
    const legacy = await getStressScenarios('acc-001')
    expect(v.stress.map((s) => [s.id, s.impact])).toEqual(legacy.map((s) => [s.id, s.portfolioImpact]))
    for (const s of v.stress) expect(s.impactValue).toBeCloseTo(s.impact * v.value, 6)
    expect(v.concentration.hhi).toBe((await getConcentration('acc-001')).summary.herfindahlIndex)
  })

  it("reflects the moved book: after the release acc-002's volatility and factors change", () => {
    const before = risk('acc-002')
    release(approvedV1())
    const after = risk('acc-002')
    expect(after.volatility).not.toBe(before.volatility)
    expect(after.factors.map((f) => f.exposure)).not.toEqual(before.factors.map((f) => f.exposure))
  })

  it('states its methods, the modeled ones tagged', () => {
    expect(risk('acc-002').methods.map((n) => [n.label, n.modeled])).toEqual([
      ['Volatility and beta', true], ['Value at risk', true], ['Tracking error', true], ['Factor exposures', true], ['Concentration', false], ['Stress tests', true],
      ['Risk score and tolerance', true], ['Screening, not suitability', false], ['Glide paths', false],
    ])
    expect(risk('acc-002').methods.find((n) => n.label === 'Tracking error')?.text).toContain('Modeled, not realized: ex-ante')
  })

  it('states the correlation assumptions and the score scale from the engine, not as fixed prose', () => {
    const text = (label: string) => risk('acc-002').methods.find((n) => n.label === label)?.text ?? ''
    expect(text('Volatility and beta')).toContain('US, international and emerging-market equity 0.85 with one another')
    expect(text('Volatility and beta')).toContain('equity with fixed income 0.30')
    expect(text('Volatility and beta')).not.toContain('0.35')
    const scale = text('Risk score and tolerance')
    for (const [band, name, modelId] of [['Conservative', 'Conservative Income', 'mod-003'], ['Aggressive', 'Aggressive Growth', 'mod-004']] as const) {
      const vol = modelVolatility(modelId)
      expect(scale).toContain(`${band}, ${name}, σ ${(vol * 100).toFixed(1)}% at ${riskScoreOf(vol)}`)
    }
    // Phase 7a final: with gold in its own group, Moderate Balanced (9.27%) to Balanced Growth (9.80%) is
    // the steepest step: 15 points across 0.53 percentage point of σ (it was Growth to Aggressive Growth).
    expect(scale).toContain('The steepest step, from Moderate Balanced to Balanced Growth, spans 15 points across 0.53 percentage points of σ')
    expect(scale).not.toMatch(/66 to 88|0\.1 percentage point|0\.53 percentage point of/)
  })
})

describe('book risk', () => {
  const book = () => {
    const v = bookRiskView('user-001')
    if (!v) throw new Error('no book risk')
    return v
  }
  const order = ['above', 'below', 'within', 'glide_path']

  it('lists every account, statuses never interleaved: above, then below, then within, glide paths last', () => {
    const rows = book().rows
    expect(rows).toHaveLength(accounts.length)
    const ranks = rows.map((r) => order.indexOf(r.posture.status))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(book().aboveTolerance).toBe(rows.filter((r) => r.posture.status === 'above').length)
    expect(book().belowTolerance).toBe(rows.filter((r) => r.posture.status === 'below').length)
  })

  it('orders above and below by how far outside the band, within by how close to the ceiling', () => {
    const rows = book().rows
    for (const status of ['above', 'below'] as const) {
      const beyond = rows.filter((r) => r.posture.status === status).map((r) => Math.abs(r.posture.beyond))
      expect(beyond.length, status).toBeGreaterThan(0)
      expect(beyond, status).toEqual([...beyond].sort((a, b) => b - a))
    }
    const headroom = rows.filter((r) => r.posture.status === 'within').map((r) => r.posture.headroom)
    expect(headroom).toEqual([...headroom].sort((a, b) => b - a))
    for (const r of rows.filter((x) => x.posture.status === 'within')) expect(r.posture.beyond, r.accountId).toBe(0)
  })

  it('the status is the sign of beyond, which is measured against the band, not the point', () => {
    for (const r of book().rows) {
      const { score, tolerance, beyond, status } = r.posture
      if (status === 'glide_path') continue
      expect(beyond, r.accountId).toBe(score > tolerance.ceiling ? score - tolerance.ceiling : score < tolerance.floor ? score - tolerance.floor : 0)
      expect(status, r.accountId).toBe(beyond > 0 ? 'above' : beyond < 0 ? 'below' : 'within')
    }
  })

  it('reads David Williams inside his band although his score is ten past his questionnaire; every above row sorts before him', () => {
    const rows = book().rows
    const williams = rows.find((r) => r.accountId === 'acc-011')!
    // Questionnaire 60, band 56–75, score 70: within, five points under the ceiling.
    expect(williams.posture).toMatchObject({ status: 'within', beyond: 0, headroom: -5 })
    expect(williams.posture.score - williams.posture.tolerance.score).toBe(10)
    const at = rows.indexOf(williams)
    expect(rows.slice(at).some((r) => r.posture.status === 'above')).toBe(false)
    // Susan Anderson's Roth, on her own band's model now, is within too.
    expect(rows.find((r) => r.accountId === 'acc-025')?.posture.status).toBe('within')
  })

  it('takes the 529s out of the tolerance comparison: glide path, listed last', () => {
    const rows = book().rows
    const glide = rows.filter((r) => r.posture.status === 'glide_path').map((r) => r.accountId)
    expect(glide).toEqual(['acc-014', 'acc-029', 'acc-032'])
    expect(rows.slice(-3).map((r) => r.accountId)).toEqual(glide)
    expect(riskQuote('acc-014')?.claim).toContain('follows a glide path')
  })

  it('the table key is the engine order', () => {
    const keys = book().rows.map((r) => r.posture.sortKey)
    expect(keys).toEqual([...keys].sort((a, b) => b - a))
  })

  // Phase 7a final: the honest book (C1) under the band-relative status (I1): the digital-asset
  // account, Robert Johnson's concentrated account and James Thompson's Roth on Aggressive Growth
  // lead; the conservative IRAs of clients who tolerate more lead the below group.
  it('puts the book in order: crypto and concentrated accounts first, conservative IRAs first among the below', () => {
    const rows = book().rows
    expect(rows.slice(0, 3).map((r) => [r.accountId, r.posture.score, r.posture.status, r.posture.beyond])).toEqual([
      ['acc-045', 100, 'above', 45], ['acc-002', 89, 'above', 34], ['acc-021', 89, 'above', 14],
    ])
    expect(rows.filter((r) => r.posture.status === 'below').slice(0, 3).map((r) => [r.accountId, r.posture.beyond])).toEqual([
      ['acc-020', -44], ['acc-046', -43], ['acc-003', -29],
    ])
    expect([book().aboveTolerance, book().belowTolerance]).toEqual([8, 10])
  })
})

describe('the boundary and the quote', () => {
  it('is firm only and knows only real accounts', () => {
    expect(accountRiskView('cli-001', 'acc-002')).toBeUndefined()
    expect(bookRiskView('prsp-011')).toBeUndefined()
    expect(accountRiskView('user-001', 'acc-999')).toBeUndefined()
  })

  it('quotes an account against its client', () => {
    const q = riskQuote('acc-045')
    expect(q).toMatchObject({ view: 'risk', subject: { type: 'account', id: 'acc-045' }, threadTitle: 'Risk · Patel Digital Assets Account' })
    expect(q?.claim).toBe(`Patel Digital Assets Account sits above ${clients.find((c) => c.id === 'cli-011')?.fullName}'s risk tolerance.`)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Risk score', 'pts'], ['Tolerance score', 'pts'], ['Volatility', '%'], ['VaR, one month, 95%', 'USD']])
    expect(riskQuote('acc-999')).toBeUndefined()
  })
})
