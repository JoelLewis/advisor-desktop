import { describe, it, expect } from 'vitest'
import { getMetricsSummary } from '@/services/pms'
import { getAIInsights } from '@/services/ai'
import { nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { calendarEvents } from '@/mocks/data/calendar'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { formatAUM } from '@/mocks/handlers/utils'
import { formatDate } from '@/lib/utils'
import { convertToBase } from '@/lib/currency'
import { isHarvestable, estimatedTaxBenefit, SHORT_TERM_RATE, LONG_TERM_RATE } from '@/features/portfolios/tax/shared'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import type { TaxTreatment } from '@/types/account'

const formatUSD = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

// Fix round 1, Important #2 — a loss inside a tax-deferred or tax-free wrapper produces no
// deduction: there is no realisation event to harvest. Kept independent of `ai.ts`'s
// `HARVEST_ELIGIBLE_TREATMENTS` so a regression to that constant (e.g. dropping `trust_taxable`,
// or gating on `taxTreatment === 'taxable'` alone and silently excluding acc-006) is caught rather
// than both sides drifting together.
const HARVEST_ELIGIBLE_TREATMENTS = new Set<TaxTreatment>(['taxable', 'trust_taxable'])

/**
 * Walks the book independently of `harvestableLotsAcrossBook` in `ai.ts` — same fixture
 * generators (`generateTaxLots`, `isHarvestable`), same rate constants, but its own aggregation,
 * currency conversion and tax-treatment gate rather than a call into the handler's helper. If the
 * production code's rate selection regresses to a flat rate, sums a native-currency number as
 * though it were USD, or stops excluding tax-advantaged accounts, this expected value diverges
 * from what the insight reports instead of moving in lockstep with the bug.
 */
function bookHarvestableLots() {
  return accounts
    .filter((account) => HARVEST_ELIGIBLE_TREATMENTS.has(account.taxTreatment))
    .flatMap((account) => {
      const currency = account.baseCurrency ?? 'USD'
      return generateTaxLots(account.id, account.totalValue)
        .filter((lot) => isHarvestable(lot.gainLoss, currency, FX_RATES_USD_BASE))
        .map((lot) => ({
          ...lot,
          accountId: account.id,
          gainLoss: convertToBase(lot.gainLoss, currency, FX_RATES_USD_BASE),
        }))
    })
}

describe('the dashboard does not contradict itself', () => {
  it('D21: pendingTasks === the number of undismissed NBAs the feed will show', async () => {
    const metrics = await getMetricsSummary()
    const active = nbas.filter((n) => !n.dismissed).length
    expect(metrics.pendingTasks).toBe(active)
    expect(metrics.pendingTasks).toBe(20)
  })

  it('D21: the insight body quotes the same count as the KPI strip, and dates itself', async () => {
    const metrics = await getMetricsSummary()
    const insights = await getAIInsights('dashboard')
    const summary = insights.find((i) => i.id === 'dash-1')!
    expect(summary.body).toContain(`${metrics.pendingTasks} pending actions`)
    // Fix round 1, minor — `metrics.asOf` was added to the type and populated but never read.
    expect(summary.body).toContain(formatDate(metrics.asOf))
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

  it('meetingsToday === events the calendar schedules for the frozen today', async () => {
    // Fix round 1, minor — the one derived count with zero coverage: reverting `meetingsToday` to
    // the literal `4` left all other dashboard-consistency tests green, because none of them
    // touch it. (It also happens to equal 4 today, which is exactly why a hardcoded regression
    // would hide here undetected without this assertion.)
    const metrics = await getMetricsSummary()
    const expected = calendarEvents.filter((e) => e.startTime.startsWith(MOCK_TODAY_ISO)).length
    expect(metrics.meetingsToday).toBe(expected)
    expect(metrics.meetingsToday).toBeGreaterThan(0)
  })

  it('alertCount === the number of unresolved compliance alerts', async () => {
    // Fix round 1, minor — this previously asserted only the literal `5`, so re-hardcoding
    // `alertCount: 5` in `pms.ts` would still pass. Symmetric with the `pendingTasks` test above:
    // assert the independent derivation matches, then pin the fixture's current value.
    const metrics = await getMetricsSummary()
    const openAlerts = complianceAlerts.filter((a) => !a.resolvedAt && a.reviewStatus !== 'approved').length
    expect(metrics.alertCount).toBe(openAlerts)
    expect(metrics.alertCount).toBe(5)
  })

  describe('D22: the harvestable-loss insight matches the estimated benefit at the applicable rates', () => {
    // PRE-FLIGHT correction 1 — the brief's original assertion bounded the benefit inclusively
    // between loss*0.37 and loss*0.238: a regression to a flat 37% lands exactly on the upper
    // bound and a flat 23.8% lands exactly on the lower bound, so the test cannot fail for the
    // defect it exists to catch. Both tests below assert exact values instead.

    it('acc-015 has a genuine mix of short- and long-term harvestable lots, confirmed before relying on it', () => {
      // Fix round 1, Important #2 — acc-018 is a Roth IRA (`taxTreatment: 'tax_free'`); a
      // harvesting benefit is domain-nonsense for it regardless of whether the arithmetic is
      // right. acc-015 is a taxable individual account with 3 short-term and 3 long-term
      // harvestable lots (the same exemplar Task 15 settled on for the same reason).
      const account = accounts.find((a) => a.id === 'acc-015')!
      expect(account.taxTreatment).toBe('taxable')
      const lots = generateTaxLots(account.id, account.totalValue)
        .filter((lot) => isHarvestable(lot.gainLoss, account.baseCurrency ?? 'USD', FX_RATES_USD_BASE))
      const short = lots.filter((l) => l.holdingPeriod === 'short')
      const long = lots.filter((l) => l.holdingPeriod === 'long')
      expect(short.length).toBeGreaterThan(0)
      expect(long.length).toBeGreaterThan(0)

      // Hand-computed from the fixture's own lots, independent of `estimatedTaxBenefit`.
      const shortLoss = short.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      const longLoss = long.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      expect(shortLoss).toBe(105_100)
      expect(longLoss).toBe(4_000)
      const expectedBenefit = 105_100 * SHORT_TERM_RATE + 4_000 * LONG_TERM_RATE
      expect(expectedBenefit).toBeCloseTo(39_839, 6)

      const actualBenefit = lots.reduce((s, l) => s + estimatedTaxBenefit(l), 0)
      expect(actualBenefit).toBeCloseTo(expectedBenefit, 6)
    })

    it('dash-3 quotes the exact book-wide loss and benefit, converted to USD and limited to accounts a loss is deductible in', async () => {
      const insights = await getAIInsights('dashboard')
      const tlh = insights.find((i) => i.id === 'dash-3')!

      const harvestable = bookHarvestableLots()
      const expectedLoss = harvestable.reduce((s, l) => s + Math.abs(l.gainLoss), 0)
      const expectedBenefit = harvestable.reduce(
        (s, l) => s + Math.abs(l.gainLoss) * (l.holdingPeriod === 'short' ? SHORT_TERM_RATE : LONG_TERM_RATE),
        0,
      )
      const expectedAccountCount = new Set(harvestable.map((l) => l.accountId)).size

      // Fix round 1, Important #2 — every included account is a real deduction: none of the 16
      // tax-deferred/tax-free accounts a naive book walk would have swept in are here.
      for (const l of harvestable) {
        const account = accounts.find((a) => a.id === l.accountId)!
        expect(HARVEST_ELIGIBLE_TREATMENTS.has(account.taxTreatment)).toBe(true)
      }

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
