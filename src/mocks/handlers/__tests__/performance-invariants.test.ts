import { describe, it, expect } from 'vitest'
import { getBenchmarkComparison, getAttribution } from '@/services/pms'

describe('performance & benchmark invariants', () => {
  it('alpha === portfolioReturn - benchmarkReturn within rounding', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    for (const comp of comparisons) {
      const expectedAlpha = comp.portfolioReturn - comp.benchmarkReturn
      expect(Math.abs(comp.alpha - expectedAlpha)).toBeLessThan(0.001)
    }
  })

  it('all standard periods are present', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    const periods = comparisons.map((c) => c.period)
    expect(periods).toContain('mtd')
    expect(periods).toContain('qtd')
    expect(periods).toContain('ytd')
    expect(periods).toContain('1y')
    expect(periods).toContain('3y')
    expect(periods).toContain('5y')
    expect(periods).toContain('inception')
  })

  it('tracking error is positive for all periods', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    for (const comp of comparisons) {
      expect(comp.trackingError).toBeGreaterThan(0)
    }
  })

  it('longer periods have larger tracking error (generally)', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    const mtd = comparisons.find((c) => c.period === 'mtd')
    const inception = comparisons.find((c) => c.period === 'inception')
    expect(inception!.trackingError).toBeGreaterThan(mtd!.trackingError)
  })
})

describe('attribution invariants', () => {
  it('total === allocation + selection + interaction per asset class', async () => {
    const attribution = await getAttribution('acc-001', 'ytd')
    for (const a of attribution) {
      const computed = a.allocation + a.selection + a.interaction
      expect(Math.abs(a.total - computed)).toBeLessThan(0.001)
    }
  })

  it('attribution covers multiple asset classes', async () => {
    const attribution = await getAttribution('acc-001', 'ytd')
    expect(attribution.length).toBeGreaterThanOrEqual(5)
  })

  it('different periods return different magnitudes', async () => {
    const mtd = await getAttribution('acc-001', 'mtd')
    const ytd = await getAttribution('acc-001', 'ytd')

    // YTD values should be larger in magnitude than MTD
    const mtdTotal = Math.abs(mtd.reduce((s, a) => s + a.total, 0))
    const ytdTotal = Math.abs(ytd.reduce((s, a) => s + a.total, 0))
    expect(ytdTotal).toBeGreaterThan(mtdTotal)
  })
})
