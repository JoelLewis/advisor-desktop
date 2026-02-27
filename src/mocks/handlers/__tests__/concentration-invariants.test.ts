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

  it('herfindahlIndex === sum(weight^2)', async () => {
    const data = await getConcentration('acc-001')
    const expectedHHI = data.positions.reduce((s, p) => s + p.weight ** 2, 0)
    expect(Math.abs(data.summary.herfindahlIndex - expectedHHI)).toBeLessThan(0.001)
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

  it('cash positions have a higher limit (0.15)', async () => {
    const data = await getConcentration('acc-001')
    const cashPositions = data.positions.filter((p) => p.assetClass === 'cash')
    for (const pos of cashPositions) {
      expect(pos.limit).toBe(0.15)
    }
  })
})
