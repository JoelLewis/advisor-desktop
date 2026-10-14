import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { BILLING_RUNS } from '@/mocks/data/billing'
import { performanceSeriesFor } from '@/mocks/handlers/pms'
import { approvedStoryV3, release } from '@/mocks/workspace/__tests__/story-fixture'
import { accountValueUSD, deriveBookAUM, deriveHouseholdAUM } from '@/lib/aum'
import { blendedTieredFee, tierSlices } from '@/lib/fees'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { isTradingDay } from '@/lib/trading-calendar'
import { FIRM_FEE_SCHEDULE, annualFeeOn, billingQuote, billingView, modeledAccountValueAt } from '../billing'

function view() {
  const v = billingView('user-001')
  if (!v) throw new Error('Adrian reads billing')
  return v
}
const account = (id: string) => {
  const a = accounts.find((x) => x.id === id)
  if (!a) throw new Error(`no ${id}`)
  return a
}

describe("the firm's schedule", () => {
  it('is tpl-001, tier by tier', () => {
    expect(FIRM_FEE_SCHEDULE.name).toBe('Comprehensive Wealth Management')
    expect(FIRM_FEE_SCHEDULE.tiers).toEqual([
      { upTo: 2_000_000, rate: 0.01 }, { upTo: 5_000_000, rate: 0.0085 }, { upTo: 10_000_000, rate: 0.007 }, { upTo: null, rate: 0.005 },
    ])
  })

  it('applies each tier to the slice inside it: the slices sum to the value and their fees to the blended fee', () => {
    for (const value of [0, 380_000, 2_000_000, 2_000_001, 4_995_000, 10_000_000, 18_750_000, 30_308_018]) {
      const slices = tierSlices(value, FIRM_FEE_SCHEDULE.tiers)
      expect(slices.reduce((s, t) => s + t.slice, 0), String(value)).toBeCloseTo(value, 6)
      expect(slices.reduce((s, t) => s + t.fee, 0), String(value)).toBeCloseTo(blendedTieredFee(value, FIRM_FEE_SCHEDULE.tiers).fee, 6)
    }
  })
})

describe("today's fees", () => {
  it("bills every household on the schedule, on the combined value of its accounts", () => {
    const v = view()
    expect(v.households.map((h) => h.householdId)).toEqual(households.map((h) => h.id))
    for (const h of v.households) {
      expect(h.value, h.householdId).toBeCloseTo(deriveHouseholdAUM(h.householdId, accounts, FX_RATES_USD_BASE), 6)
      expect(h.annualFee, h.householdId).toBeCloseTo(annualFeeOn(h.value), 6)
      expect(h.quarterlyFee, h.householdId).toBeCloseTo(h.annualFee / 4, 6)
      expect(h.effectiveRate, h.householdId).toBeCloseTo(h.annualFee / h.value, 12)
      expect(h.tiers.reduce((s, t) => s + t.fee, 0), h.householdId).toBeCloseTo(h.annualFee, 6)
    }
  })

  it('totals the households, and the billed value is the book: $679,305 a year, 74.39 bps', () => {
    const v = view()
    expect(v.totals.value).toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
    expect(v.totals.annualFee).toBeCloseTo(v.households.reduce((s, h) => s + h.annualFee, 0), 6)
    expect(v.totals.quarterlyFee).toBeCloseTo(v.totals.annualFee / 4, 6)
    expect(Math.round(v.totals.annualFee)).toBe(679_305)
    expect(v.totals.effectiveRate * 10_000).toBeCloseTo(74.39, 2)
  })

  it('Johnson: four tiers on $18,750,000, $124,250 a year', () => {
    const johnson = view().households.find((h) => h.householdId === 'hh-001')
    expect(johnson?.tiers.map((t) => t.slice)).toEqual([2_000_000, 3_000_000, 5_000_000, 8_750_000])
    expect(johnson?.annualFee).toBeCloseTo(124_250, 6)
  })

  it('names the next tier where there is one', () => {
    const v = view()
    expect(v.households.find((h) => h.householdId === 'hh-009')?.nextTier).toEqual({ at: 2_000_000, rate: 0.0085 })
    expect(v.households.find((h) => h.householdId === 'hh-002')?.nextTier).toBeUndefined()
  })

  it("states each household's billing method from its agreement: O'Brien and Garcia bill in arrears", () => {
    const arrears = view().households.filter((h) => h.method === 'arrears').map((h) => h.householdId)
    expect(arrears).toEqual(['hh-008', 'hh-010'])
  })
})

describe('the billing runs', () => {
  it('are the three quarterly runs, newest first, each on a trading day, valued at the quarter end before it', () => {
    const runs = view().runs
    expect(runs.map((r) => [r.id, r.runDate, r.valuationDate])).toEqual([
      ['run-2026-01', '2026-01-02', '2025-12-31'], ['run-2025-10', '2025-10-01', '2025-09-30'], ['run-2025-07', '2025-07-01', '2025-06-30'],
    ])
    for (const r of runs) expect(isTradingDay(r.runDate), r.id).toBe(true)
    expect(runs).toHaveLength(BILLING_RUNS.length)
  })

  it('each run total is the sum of its households; each fee is a quarter of the schedule on the modeled valuation', () => {
    for (const run of view().runs) {
      expect(run.total, run.id).toBeCloseTo(run.households.reduce((s, h) => s + h.fee, 0), 6)
      for (const h of run.households) expect(h.fee, `${run.id} ${h.householdId}`).toBeCloseTo(annualFeeOn(h.valuation) / 4, 6)
    }
  })

  it('values only the accounts open by the valuation date, each at its modeled quarter-end value', () => {
    for (const run of view().runs) {
      for (const h of run.households) {
        const open = accounts.filter((a) => a.householdId === h.householdId && a.openDate <= run.valuationDate)
        expect(h.valuation, `${run.id} ${h.householdId}`).toBeCloseTo(open.reduce((s, a) => s + modeledAccountValueAt(a, run.valuationDate), 0), 4)
      }
    }
  })

  it('an advance household pays for the coming quarter; an arrears household for the quarter just ended', () => {
    const [latest] = view().runs
    expect(latest?.households.find((h) => h.householdId === 'hh-001')).toMatchObject({ method: 'advance', covers: 'Q1 2026' })
    expect(latest?.households.find((h) => h.householdId === 'hh-010')).toMatchObject({ method: 'arrears', covers: 'Q4 2025' })
  })

  it("are not rewritten by a release, and neither are today's values", () => {
    const before = view()
    release(approvedStoryV3())
    const after = view()
    expect(after.runs).toEqual(before.runs)
    expect(after.households.map((h) => h.value)).toEqual(before.households.map((h) => h.value))
  })
})

describe('the modeled quarter-end value', () => {
  it("is today's value on today's date", () => {
    const acc = account('acc-001')
    expect(modeledAccountValueAt(acc, MOCK_TODAY_ISO)).toBeCloseTo(accountValueUSD(acc, FX_RATES_USD_BASE), 6)
  })

  it('lies between the values at the two monthly points around the date', () => {
    const acc = account('acc-001')
    const series = performanceSeriesFor(acc, 'fixtures')
    const last = series[series.length - 1]!
    const i = series.findIndex((p) => p.date >= '2025-12-31')
    const [a, b] = [series[i - 1]!, series[i]!].map((p) => (accountValueUSD(acc, FX_RATES_USD_BASE) * p.value) / last.value)
    const v = modeledAccountValueAt(acc, '2025-12-31')
    expect(v).toBeGreaterThanOrEqual(Math.min(a!, b!))
    expect(v).toBeLessThanOrEqual(Math.max(a!, b!))
  })

  it('refuses a date before the series starts', () => {
    expect(() => modeledAccountValueAt(account('acc-001'), '2023-06-30')).toThrow('does not reach 2023-06-30')
  })
})

describe('exceptions, methods and the boundary', () => {
  it("Garcia's exception matches her terms: her agreement bills in arrears, the custodian's file says advance", () => {
    const garcia = view().exceptions.find((e) => e.householdId === 'hh-010')
    expect(garcia).toMatchObject({ kind: 'schedule_mismatch', runId: 'run-2026-01', householdName: 'Garcia Household' })
    expect(garcia?.description).toMatch(/agreement bills in arrears/)
    expect(garcia?.resolvedAt).toBeUndefined()
  })

  it('no exception speaks of a breakpoint or a missing value', () => {
    for (const e of view().exceptions) expect(e.description, e.id).not.toMatch(/breakpoint|AUM basis|missing/i)
  })

  it('states its methods; the quarter-end values are the one modeled note', () => {
    const notes = view().methods
    expect(notes.map((n) => n.label)).toEqual(['Schedule', "Today's fees", 'Billing runs', 'Quarter-end values'])
    expect(notes.filter((n) => n.modeled).map((n) => n.label)).toEqual(['Quarter-end values'])
    expect(notes.find((n) => n.modeled)?.text).toMatch(/^Modeled, not realized/)
  })

  it('is firm only', () => {
    expect(billingView('cli-001')).toBeUndefined()
    expect(billingView('prsp-011')).toBeUndefined()
    expect(billingView('cco-001')).toBeDefined()
  })

  it('quotes a household: a claim with no figure in it, each figure with its source', () => {
    const q = billingQuote('hh-001')
    expect(q).toMatchObject({ view: 'billing', rowId: 'hh-001', subject: { type: 'household', id: 'hh-001' }, threadTitle: 'Billing · Johnson Household' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(q?.figures.map((f) => [f.label, f.unit])).toEqual([['Value today', 'USD'], ['Annual fee', 'USD'], ['Effective rate', '%']])
    expect(billingQuote('hh-999')).toBeUndefined()
  })

  it('the hand-typed billing, revenue and practice surfaces are gone', () => {
    for (const path of ['src/mocks/data/revenue.ts', 'src/mocks/data/practice.ts', 'src/mocks/handlers/billing.ts', 'src/mocks/handlers/revenue.ts',
      'src/mocks/handlers/practice.ts', 'src/services/billing.ts', 'src/services/revenue.ts', 'src/services/practice.ts', 'src/types/billing.ts']) {
      expect(existsSync(path), path).toBe(false)
    }
  })
})
