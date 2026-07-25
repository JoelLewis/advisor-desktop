import { describe, it, expect } from 'vitest'
import { getMetricsSummary } from '@/services/pms'
import { getAIInsights } from '@/services/ai'
import { nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { formatAUM } from '@/mocks/handlers/utils'
import { isHarvestable, estimatedTaxBenefit, SHORT_TERM_RATE, LONG_TERM_RATE } from '@/features/portfolios/tax/shared'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

const formatUSD = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

/**
 * Walks the book independently of `harvestableLotsAcrossBook` in `ai.ts` — same fixture
 * generators (`generateTaxLots`, `isHarvestable`), same rate constants, but its own aggregation
 * logic rather than a call into the handler's helper. If the production code's rate selection
 * regresses to a flat rate, this expected value — computed with its own short/long ternary — no
 * longer matches what the insight reports, so the mismatch is caught rather than both sides
 * drifting together.
 */
function bookHarvestableLots() {
  return accounts.flatMap((account) => {
    const currency = account.baseCurrency ?? 'USD'
    return generateTaxLots(account.id, account.totalValue)
      .filter((lot) => isHarvestable(lot.gainLoss, currency, FX_RATES_USD_BASE))
      .map((lot) => ({ ...lot, accountId: account.id }))
  })
}

describe('the dashboard does not contradict itself', () => {
  it('D21: pendingTasks === the number of undismissed NBAs the feed will show', async () => {
    const metrics = await getMetricsSummary()
    const active = nbas.filter((n) => !n.dismissed).length
    expect(metrics.pendingTasks).toBe(active)
    expect(metrics.pendingTasks).toBe(20)
  })

  it('D21: the insight body quotes the same count as the KPI strip', async () => {
    const metrics = await getMetricsSummary()
    const insights = await getAIInsights('dashboard')
    const summary = insights.find((i) => i.id === 'dash-1')!
    expect(summary.body).toContain(`${metrics.pendingTasks} pending actions`)
  })

  it('D21: the critical-action headline and body quote the same number', async () => {
    const metrics = await getMetricsSummary()
    const insights = await getAIInsights('dashboard')
    // PRE-FLIGHT correction 5 — assert the insight exists rather than `if (!critical) return`,
    // which passes vacuously the moment the insight stops being generated.
    const critical = insights.find((i) => i.id === 'dash-2')
    expect(critical).toBeDefined()
    const headline = Number(/^(\d+)/.exec(critical!.title)![1])
    const body = Number(/^(\d+)/.exec(critical!.body)![1])
    expect(body).toBe(headline)
    expect(headline).toBe(metrics.criticalCount)
    expect(headline).toBe(2)
  })

  it('D21: net flows appear once, in one figure', async () => {
    const metrics = await getMetricsSummary()
    const insights = await getAIInsights('dashboard')
    const summary = insights.find((i) => i.id === 'dash-1')!
    expect(summary.metric?.value).toBe(formatUSD(metrics.netFlowsMTD))
  })

  it('alertCount === the number of unresolved compliance alerts', async () => {
    const metrics = await getMetricsSummary()
    expect(metrics.alertCount).toBe(5)
  })

  describe('D22: the harvestable-loss insight matches the estimated benefit at the applicable rates', () => {
    // PRE-FLIGHT correction 1 — the brief's original assertion bounded the benefit inclusively
    // between loss*0.37 and loss*0.238: a regression to a flat 37% lands exactly on the upper
    // bound and a flat 23.8% lands exactly on the lower bound, so the test cannot fail for the
    // defect it exists to catch. Both tests below assert exact values instead.

    it('acc-018 has a genuine mix of short- and long-term harvestable lots, confirmed before relying on it', () => {
      const account = accounts.find((a) => a.id === 'acc-018')!
      const lots = generateTaxLots(account.id, account.totalValue)
        .filter((lot) => isHarvestable(lot.gainLoss, account.baseCurrency ?? 'USD', FX_RATES_USD_BASE))
      const short = lots.filter((l) => l.holdingPeriod === 'short')
      const long = lots.filter((l) => l.holdingPeriod === 'long')
      expect(short.length).toBeGreaterThan(0)
      expect(long.length).toBeGreaterThan(0)

      // Hand-computed from the fixture's own lots, independent of `estimatedTaxBenefit`.
      const shortLoss = short.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      const longLoss = long.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      expect(shortLoss).toBe(4_550)
      expect(longLoss).toBe(9_100)
      const expectedBenefit = 4_550 * SHORT_TERM_RATE + 9_100 * LONG_TERM_RATE
      expect(expectedBenefit).toBeCloseTo(3_849.3, 6)

      const actualBenefit = lots.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
      expect(actualBenefit).toBeCloseTo(expectedBenefit, 6)
    })

    it('dash-3 quotes the exact book-wide loss and benefit, not a value that happens to fall in a range', async () => {
      const insights = await getAIInsights('dashboard')
      const tlh = insights.find((i) => i.id === 'dash-3')!

      const harvestable = bookHarvestableLots()
      const expectedLoss = harvestable.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      const expectedBenefit = harvestable.reduce(
        (s, l) => s + Math.abs(l.gainLoss) * (l.holdingPeriod === 'short' ? SHORT_TERM_RATE : LONG_TERM_RATE),
        0,
      )
      const expectedAccountCount = new Set(harvestable.map((l) => l.accountId)).size

      expect(tlh.body).toContain(formatAUM(expectedLoss))
      expect(tlh.body).toContain(`${expectedAccountCount} client accounts`)
      expect(tlh.metric?.value).toBe(formatUSD(expectedBenefit))
      // Sanity: the book is not flat one way or the other, so a flat-rate regression would move
      // this figure by a knowable amount rather than being masked by coincidence.
      expect(expectedBenefit).toBeGreaterThan(expectedLoss * LONG_TERM_RATE)
      expect(expectedBenefit).toBeLessThan(expectedLoss * SHORT_TERM_RATE)
    })
  })
})
