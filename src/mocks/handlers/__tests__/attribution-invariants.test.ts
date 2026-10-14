import { describe, it, expect } from 'vitest'
import { getAttribution, getBenchmarkComparison, getDrift, getSensitivity } from '@/services/pms'
import { assetClassWeights, assetClassReturn1Y } from '@/lib/risk-model'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { accounts } from '@/mocks/data/accounts'
import { isModelManaged } from '@/lib/mandate'

/** Mirrors the API's publication rounding, so the tests can assert equality rather than nearness. */
const roundTo = (value: number, decimals: number) =>
  Math.round(value * 10 ** decimals) / 10 ** decimals

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
      // Exactly, not nearly: the benchmark row's active return *is* the attribution total rounded
      // for publication, so the assertion is on that relationship rather than on a tolerance that
      // a genuinely different figure could still slip through.
      expect(roundTo(result.activeReturn, 4)).toBe(row.activeReturn)
      expect(roundTo(result.totals.total, 4)).toBe(row.activeReturn)
      // The published row foots at the precision it is published.
      expect(roundTo(row.portfolioReturn - row.benchmarkReturn, 4)).toBe(row.activeReturn)
    }
  })

  it('C1: periods are not a linear stretch of the YTD figure', async () => {
    const ytd = await getAttribution('acc-001', 'ytd')
    const oneYear = await getAttribution('acc-001', '1y')
    expect(oneYear.totals.total / ytd.totals.total).not.toBeCloseTo(1.8, 2)
  })

  /**
   * `model: 'Brinson-Fachler'` is a literal string, and BF and Brinson-Hood-Beebower produce
   * *identical totals* — the −Rb cancels in aggregate because Σ(wp − wb) = 0 — so every other test
   * in this file would still pass if the `− benchmarkReturn` were deleted from the handler and the
   * label left in place. The variants differ only row by row, so that is where this asserts.
   *
   * The 1Y window is used because years = 1 makes the compounding an identity, which lets the
   * expected value be written in closed form from the fixture rather than re-deriving the handler.
   */
  it('the allocation effect is Brinson-Fachler, not Brinson-Hood-Beebower', async () => {
    // Model-managed accounts, whose benchmark weights are their drift targets; a custom mandate's are its own.
    for (const account of accounts.filter(isModelManaged)) {
    const weights = assetClassWeights(getPositionsForAccount(account.id, account.totalValue))
    const drift = await getDrift(account.id)
    const benchWeights = new Map(drift.assetClassDrifts.map((d) => [d.assetClass as string, d.target]))
    const benchmarkTotal = [...benchWeights].reduce(
      (sum, [ac, wb]) => sum + wb * assetClassReturn1Y(ac), 0,
    )

    const { rows } = await getAttribution(account.id, '1y')
    for (const row of rows) {
      const wp = weights.get(row.assetClass) ?? 0
      const wb = benchWeights.get(row.assetClass) ?? 0
      // Brinson-Fachler: the class return is measured against the benchmark's *total* return.
      //
      // The tolerance is deliberately coarse, and must not be tightened to the publication grid.
      // `allocation` is published as `roundTo(exact, 6)`, so any assertion at 5e-7 sits *on* the
      // rounding boundary: acc-014's commodities row is a genuine .5 tie (−0.0003275) whose two
      // computations differ in the last bits, so it measures 5.000000000007711e-7 and fails both
      // `toBeCloseTo(…, 6)` and an inclusive <=5e-7. That failure would be a float artefact, not a
      // model break — and this test exists to discriminate the *model*. C2 and C3 audit the
      // rounding exactly; here, 1e-5 stays 20× clear of the grid while BHB misses by ~6.6e-3,
      // which is 660× the bound. Both properties are what make this assertion meaningful.
      const exact = (wp - wb) * (assetClassReturn1Y(row.assetClass) - benchmarkTotal)
      expect(Math.abs(row.allocation - exact), `${account.id} ${row.assetClass}`)
        .toBeLessThanOrEqual(1e-5)
    }

    // And is demonstrably not BHB, which would measure against the class's own return. On acc-001's
    // cash the two do not merely differ, they carry opposite signs: cash returned 4.8% against a
    // benchmark total of 9.4%, so overweighting it is a positive contribution under BHB and a
    // negative one under BF. Scoped to acc-001 because the opposite-sign property is a fact about
    // that account's weights, not a general one. If this ever passes trivially the discriminator
    // has stopped discriminating.
    if (account.id === 'acc-001') {
      const cash = rows.find((r) => r.assetClass === 'cash')!
      const bhbCash = ((weights.get('cash') ?? 0) - (benchWeights.get('cash') ?? 0))
        * assetClassReturn1Y('cash')
      expect(Math.sign(bhbCash)).not.toBe(Math.sign(cash.allocation))
      expect(cash.allocation).not.toBeCloseTo(bhbCash, 6)
    }
    }
  })

  /**
   * Important #1 from review: `riskProfileFor.ret` used to be a second expression for the account's
   * one-year return and disagreed with the benchmark table by 1e-4 on 12 of the 47 accounts —
   * 10.09% on the performance tab against 10.08% on risk analytics. There is now one derivation,
   * so the two are the same number, not merely close.
   */
  it('the 1Y portfolio return is one number across the benchmark table and the risk surfaces', async () => {
    for (const account of accounts) {
      const bench = await getBenchmarkComparison(account.id)
      const { monteCarlo } = await getSensitivity(account.id)
      const oneYear = bench.find((b) => b.period === '1y')!
      expect(monteCarlo.expectedReturn, account.id).toBe(oneYear.portfolioReturn)
    }
  })

  it('states the model, the linking, the benchmark and the fee basis', async () => {
    const result = await getAttribution('acc-001', 'ytd')
    expect(result.model).toBe('Brinson-Fachler')
    expect(result.linking).toBe('single-period arithmetic')
    expect(result.basis).toBe('gross of fees')
    expect(result.benchmark).toBe('Balanced Growth policy benchmark')
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
        expect(roundTo(result.totals.total, 4), where).toBe(row.activeReturn)
        expect(roundTo(row.portfolioReturn - row.benchmarkReturn, 4), where).toBe(row.activeReturn)
      }
    }
  })
})
