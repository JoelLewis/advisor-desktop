import { describe, it, expect } from 'vitest'
import { getAttribution, getBenchmarkComparison } from '@/services/pms'
import { accounts } from '@/mocks/data/accounts'

const PERIODS = ['mtd', 'qtd', 'ytd', '1y']

describe('Brinson attribution identity', () => {
  it('C3: every row satisfies total === allocation + selection + interaction', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    expect(result.rows.length).toBeGreaterThan(0)
    for (const row of result.rows) {
      expect(row.total).toBeCloseTo(row.allocation + row.selection + row.interaction, 6)
    }
  })

  it('C3: the totals block includes interaction, so the summary cards add up', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    const { allocation, selection, interaction, total } = result.totals
    expect(allocation + selection + interaction).toBeCloseTo(total, 6)
    expect(interaction).not.toBe(0)
  })

  it('C2: Rp − Rb === Σ(A + S + I) — attribution reconciles to active return', async () => {
    for (const period of ['mtd', 'qtd', 'ytd', '1y']) {
      const result = await getAttribution('acc-001', period)
      const bench = await getBenchmarkComparison('acc-001')
      const row = bench.find((b) => b.period === period)!
      expect(result.activeReturn).toBeCloseTo(row.activeReturn, 4)
      expect(result.totals.total).toBeCloseTo(row.activeReturn, 4)
    }
  })

  it('C1: periods are not a linear stretch of the YTD figure', async () => {
    const ytd = await getAttribution('acc-001', 'ytd')
    const oneYear = await getAttribution('acc-001', '1y')
    expect(oneYear.totals.total / ytd.totals.total).not.toBeCloseTo(1.8, 2)
  })

  it('states the model, the linking, the benchmark and the fee basis', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    expect(result.model).toBe('Brinson-Fachler')
    expect(result.linking).toBe('single-period arithmetic')
    expect(result.basis).toBe('gross of fees')
    expect(result.benchmark).toBe('S&P 500 / Agg 60/40')
  })

  // The identity is the acceptance test for this model, so it is asserted where it is exact —
  // on the attribution response itself — for every account, not just the one the page opens on.
  // Both weight sets sum to one, so the effects collapse to Σ wp·Rp,i − Σ wb·Rb,i with nothing
  // left over; anything beyond float noise means a term has been dropped or double-counted.
  it('the identity is exact for every account and every period, not merely close', async () => {
    for (const account of accounts) {
      for (const period of PERIODS) {
        const { rows, totals } = await getAttribution(account.id, period)
        const where = `${account.id} ${period}`
        expect(rows.length, where).toBeGreaterThan(0)
        for (const row of rows) {
          expect(row.total, `${where} ${row.assetClass}`)
            .toBeCloseTo(row.allocation + row.selection + row.interaction, 12)
        }
        const summed = rows.reduce(
          (acc, r) => ({
            allocation: acc.allocation + r.allocation,
            selection: acc.selection + r.selection,
            interaction: acc.interaction + r.interaction,
            total: acc.total + r.total,
          }),
          { allocation: 0, selection: 0, interaction: 0, total: 0 },
        )
        expect(totals.allocation, where).toBeCloseTo(summed.allocation, 12)
        expect(totals.selection, where).toBeCloseTo(summed.selection, 12)
        expect(totals.interaction, where).toBeCloseTo(summed.interaction, 12)
        expect(totals.total, where).toBeCloseTo(
          totals.allocation + totals.selection + totals.interaction, 12,
        )
      }
    }
  })

  /**
   * acc-041 (HKD), acc-042 (SGD), acc-043 (EUR) and acc-044 (CHF) are the only non-USD accounts
   * and have twice been the accounts a fix was wrong on. Attribution is currency-neutral by
   * construction — weights are ratios of position values inside one account, and asset-class
   * returns are index returns, so no FX rate enters the arithmetic and none should — but the
   * assertion is written down rather than assumed.
   */
  it('holds on the non-USD accounts, whose attribution carries no FX term', async () => {
    for (const id of ['acc-041', 'acc-042', 'acc-043', 'acc-044']) {
      const bench = await getBenchmarkComparison(id)
      for (const period of PERIODS) {
        const result = await getAttribution(id, period)
        const row = bench.find((b) => b.period === period)!
        const where = `${id} ${period}`
        expect(result.totals.total, where).toBeCloseTo(
          result.totals.allocation + result.totals.selection + result.totals.interaction, 12,
        )
        expect(result.totals.total, where).toBeCloseTo(row.activeReturn, 4)
        expect(result.totals.total, where)
          .toBeCloseTo(row.portfolioReturn - row.benchmarkReturn, 4)
      }
    }
  })
})
