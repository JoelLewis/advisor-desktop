import { describe, it, expect } from 'vitest'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { ATTRIBUTION_PERIODS } from '@/types/reference-attribution'
import { attributionQuote, attributionView } from '../attribution'

const view = (accountId = 'acc-002', period: (typeof ATTRIBUTION_PERIODS)[number]['id'] = 'ytd') => {
  const v = attributionView('user-001', accountId, period)
  if (!v) throw new Error(`no attribution for ${accountId}`)
  return v
}

describe('the attribution read model', () => {
  it('offers six periods; inception, a hand-typed length, is not one', () => {
    expect(view().periods.map((p) => p.id)).toEqual(['mtd', 'qtd', 'ytd', '1y', '3y', '5y'])
  })

  it('reconciles exactly for every period: Σ(A + S + I) is the active return, and Rp − Rb too', () => {
    for (const { id } of ATTRIBUTION_PERIODS) {
      const v = view('acc-002', id)
      const sum = v.rows.reduce((s, r) => s + r.allocation + r.selection + r.interaction, 0)
      expect(sum, id).toBeCloseTo(v.totals.total, 6)
      expect(v.activeReturn, id).toBeCloseTo(v.totals.total, 4)
      expect(v.portfolioReturn - v.benchmarkReturn, id).toBeCloseTo(v.activeReturn, 8)
    }
  })

  it("carries both weight sets, each summing to one, and the benchmark's components", () => {
    const v = view()
    expect(v.rows.reduce((s, r) => s + r.portfolioWeight, 0)).toBeCloseTo(1, 9)
    expect(v.rows.reduce((s, r) => s + r.benchmarkWeight, 0)).toBeCloseTo(1, 9)
    expect(v.benchmark.name).toBe('Growth policy benchmark')
    expect(v).toMatchObject({ accountName: 'Robert Johnson Individual', modelName: 'Growth' })
  })

  it("draws the line from the account's modeled series, ending today; one benchmark line per model", () => {
    const v = view()
    expect(v.series).toHaveLength(25)
    expect(v.series[v.series.length - 1]?.date).toBe(MOCK_TODAY_ISO)
    expect(view('acc-011').series.map((p) => p.benchmark)).toEqual(view('acc-040').series.map((p) => p.benchmark))
  })

  it("reflects the moved book: after the release acc-002's weights change", () => {
    const before = view().rows.map((r) => [r.assetClass, r.portfolioWeight])
    release(approvedV1())
    expect(view().rows.map((r) => [r.assetClass, r.portfolioWeight])).not.toEqual(before)
  })

  it("keeps the performance line on the fixtures basis: today's release does not rewrite it", () => {
    const before = view().series
    release(approvedV1())
    expect(view().series).toEqual(before)
  })

  it('states its caption as methods: Brinson-Fachler, single period, arithmetic, modeled returns', () => {
    const notes = view().methods
    expect(notes.map((n) => n.label)).toEqual(['Model', 'Linking', 'Returns', 'Benchmark', 'Performance line', 'Fees'])
    expect(notes.filter((n) => n.modeled).map((n) => n.label)).toEqual(['Returns', 'Performance line'])
  })

  it('is firm only and knows only real accounts', () => {
    expect(attributionView('cli-001', 'acc-002', 'ytd')).toBeUndefined()
    expect(attributionView('prsp-011', 'acc-002', 'ytd')).toBeUndefined()
    expect(attributionView('user-001', 'acc-999', 'ytd')).toBeUndefined()
  })

  it('quotes an asset-class row: its three effects, in percentage points', () => {
    const q = attributionQuote('acc-002:ytd:us_equity')
    expect(q).toMatchObject({ view: 'attribution', subject: { type: 'account', id: 'acc-002' }, threadTitle: 'Attribution · Robert Johnson Individual' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Allocation', 'pp'], ['Selection', 'pp'], ['Interaction', 'pp'], ['Total', 'pp']])
    expect(attributionQuote('acc-002:inception:us_equity')).toBeUndefined()
    expect(attributionQuote('acc-002:ytd:collectibles')).toBeUndefined()
  })
})
