import { describe, it, expect } from 'vitest'
import { getBenchmarkComparison, getAttribution, getRiskMetrics } from '@/services/pms'

describe('performance & benchmark invariants', () => {
  it('activeReturn === portfolioReturn - benchmarkReturn within rounding', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    for (const comp of comparisons) {
      const expected = comp.portfolioReturn - comp.benchmarkReturn
      expect(Math.abs(comp.activeReturn - expected)).toBeLessThan(0.001)
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

  // C6 · performance-reporting — tracking error is one annualised statistic reported on the risk
  // metrics, not a different number per horizon on every benchmark row.
  it('tracking error is a single annualised figure on the risk metrics', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    for (const comp of comparisons) {
      expect(comp).not.toHaveProperty('trackingError')
    }
    const risk = await getRiskMetrics('acc-001')
    expect(risk.trackingError).toBeGreaterThan(0)
  })

  it('longer periods compound to larger cumulative returns', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    const mtd = comparisons.find((c) => c.period === 'mtd')!
    const inception = comparisons.find((c) => c.period === 'inception')!
    expect(inception.portfolioReturn).toBeGreaterThan(mtd.portfolioReturn)
  })

  // On a February date the quarter-to-date and year-to-date windows are the same window.
  it('quarter-to-date does not read longer than year-to-date in Q1', async () => {
    const comparisons = await getBenchmarkComparison('acc-001')
    const qtd = comparisons.find((c) => c.period === 'qtd')!
    const ytd = comparisons.find((c) => c.period === 'ytd')!
    expect(qtd.portfolioReturn).toBe(ytd.portfolioReturn)
  })
})

describe('attribution invariants', () => {
  it('total === allocation + selection + interaction per asset class', async () => {
    const { rows } = await getAttribution('acc-001', 'ytd')
    for (const a of rows) {
      const computed = a.allocation + a.selection + a.interaction
      expect(Math.abs(a.total - computed)).toBeLessThan(0.001)
    }
  })

  it('attribution covers multiple asset classes', async () => {
    const { rows } = await getAttribution('acc-001', 'ytd')
    expect(rows.length).toBeGreaterThanOrEqual(5)
  })

  it('different periods return different magnitudes', async () => {
    const mtd = await getAttribution('acc-001', 'mtd')
    const ytd = await getAttribution('acc-001', 'ytd')

    // YTD values should be larger in magnitude than MTD
    expect(Math.abs(ytd.totals.total)).toBeGreaterThan(Math.abs(mtd.totals.total))
  })
})
