import { describe, it, expect } from 'vitest'
import { getDriftSummary, getModels } from '@/services/pms'

describe('drift calculation invariants', () => {
  it('drift >= 0 for every asset class across all accounts', async () => {
    const drifts = await getDriftSummary()
    for (const d of drifts) {
      for (const ac of d.assetClassDrifts) {
        expect(ac.drift).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('drift === |actual - target| within rounding tolerance', async () => {
    const drifts = await getDriftSummary()
    for (const d of drifts) {
      for (const ac of d.assetClassDrifts) {
        const expected = Math.abs(ac.actual - ac.target)
        expect(Math.abs(ac.drift - expected)).toBeLessThan(0.002)
      }
    }
  })

  it('totalDrift === sum(drifts) / 2 within rounding tolerance', async () => {
    const drifts = await getDriftSummary()
    for (const d of drifts) {
      const sumDrifts = d.assetClassDrifts.reduce((s, ac) => s + ac.drift, 0)
      const expected = sumDrifts / 2
      expect(Math.abs(d.totalDrift - expected)).toBeLessThan(0.002)
    }
  })

  it('needsRebalance === totalDrift > 0.03', async () => {
    const drifts = await getDriftSummary()
    for (const d of drifts) {
      expect(d.needsRebalance).toBe(d.totalDrift > 0.03)
    }
  })

  it('actual weights roughly sum to 1.0 for each account', async () => {
    const drifts = await getDriftSummary()
    for (const d of drifts) {
      const sumActual = d.assetClassDrifts.reduce((s, ac) => s + ac.actual, 0)
      expect(sumActual).toBeCloseTo(1.0, 1)
    }
  })

  it('all 7 models have target weights that sum to 1.0', async () => {
    const models = await getModels()
    expect(models).toHaveLength(7)
    for (const model of models) {
      const sumTargets = (model as unknown as { assetClasses: { targetWeight: number }[] })
        .assetClasses.reduce((s: number, ac: { targetWeight: number }) => s + ac.targetWeight, 0)
      expect(sumTargets).toBeCloseTo(1.0, 2)
    }
  })

  it('returns drift data for all 45 accounts', async () => {
    const drifts = await getDriftSummary()
    expect(drifts).toHaveLength(45)
  })

  it('acc-001 has drift data with valid structure', async () => {
    const drifts = await getDriftSummary()
    const acc001 = drifts.find((d) => d.accountId === 'acc-001')
    expect(acc001).toBeDefined()
    expect(acc001!.assetClassDrifts.length).toBeGreaterThan(0)
    expect(acc001!.lastCalculated).toBeTruthy()
  })
})
