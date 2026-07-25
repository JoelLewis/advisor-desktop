import { describe, it, expect } from 'vitest'
import { getConcentration } from '@/services/pms'

describe('concentration & compliance invariants', () => {
  it('positions are sorted by weight descending', async () => {
    const data = await getConcentration('acc-001')
    for (let i = 1; i < data.positions.length; i++) {
      expect(data.positions[i]!.weight).toBeLessThanOrEqual(data.positions[i - 1]!.weight)
    }
  })

  it('top10Weight === sum of top 10 position weights', async () => {
    const data = await getConcentration('acc-001')
    const top10 = data.positions.slice(0, 10)
    const expectedTop10Weight = top10.reduce((s, p) => s + p.weight, 0)
    expect(Math.abs(data.summary.top10Weight - expectedTop10Weight)).toBeLessThan(0.002)
  })

  it('breached === weight > limit for each position', async () => {
    const data = await getConcentration('acc-001')
    for (const pos of data.positions) {
      expect(pos.breached).toBe(pos.weight > pos.limit)
    }
  })

  it('breachCount matches count of breached positions', async () => {
    const data = await getConcentration('acc-001')
    const breachedCount = data.positions.filter((p) => p.breached).length
    expect(data.summary.breachCount).toBe(breachedCount)
  })

  it('totalPositions matches actual position count', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.totalPositions).toBe(data.positions.length)
  })

  it('all positions have required fields', async () => {
    const data = await getConcentration('acc-001')
    for (const pos of data.positions) {
      expect(pos.symbol).toBeTruthy()
      expect(pos.name).toBeTruthy()
      expect(pos.assetClass).toBeTruthy()
      expect(pos.marketValue).toBeGreaterThan(0)
      expect(pos.weight).toBeGreaterThan(0)
      expect(pos.limit).toBeGreaterThan(0)
    }
  })

  it('C23: acc-001 has no breach — VTI at 27.8% is a fund, not a single issuer', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.breachCount).toBe(0)
    const vti = data.positions.find((p) => p.symbol === 'VTI')!
    expect(vti.kind).toBe('fund')
    expect(vti.weight).toBeCloseTo(0.278, 3)
    expect(vti.limit).toBe(0.35)
    expect(vti.breached).toBe(false)
  })

  it('C23: acc-011 breaches on NVDA at 13.9% and nothing else', async () => {
    const data = await getConcentration('acc-011')
    const breaches = data.positions.filter((p) => p.breached)
    expect(breaches.map((b) => b.symbol)).toEqual(['NVDA'])
    expect(breaches[0]!.weight).toBeCloseTo(0.139, 3)
    expect(breaches[0]!.kind).toBe('single_name')
    expect(breaches[0]!.limit).toBe(0.10)
  })

  it('C22: HHI is on the 0-10,000 scale with an effective-N companion', async () => {
    const data = await getConcentration('acc-001')
    expect(data.summary.herfindahlIndex).toBeGreaterThan(100)
    expect(data.summary.effectiveN).toBeCloseTo(10_000 / data.summary.herfindahlIndex, 0)
  })
})
