import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { deriveBookAUM } from '@/lib/aum'
import { billingRuns, billingView } from '../billing'
import { practiceQuote, practiceView } from '../practice'

function view() {
  const v = practiceView('user-001')
  if (!v) throw new Error('Adrian reads practice')
  return v
}

describe('practice', () => {
  it("takes its revenue from billing: today's fees and the effective fee", () => {
    const billing = billingView('user-001')
    expect(view().revenue.annual).toBeCloseTo(billing?.totals.annualFee ?? Number.NaN, 6)
    expect(view().revenue.effectiveRate).toBeCloseTo(billing?.totals.effectiveRate ?? Number.NaN, 12)
  })

  it('names the latest billing run, whose total is modeled', () => {
    const [latest] = billingRuns()
    expect(view().revenue.lastRun).toEqual({ id: latest?.id, runDate: latest?.runDate, total: latest?.total })
  })

  it('counts the book from the accounts: $91,320,824 across 13 households and 47 accounts', () => {
    const { book } = view()
    expect(book.value).toBeCloseTo(deriveBookAUM(accounts, FX_RATES_USD_BASE), 4)
    expect(Math.round(book.value)).toBe(91_320_824)
    expect(book).toMatchObject({ households: 13, accounts: 47, clients: new Set(accounts.map((a) => a.clientId)).size })
  })

  it('every breakdown sums to the book', () => {
    const v = view()
    for (const [name, rows] of [['segment', v.bySegment], ['account type', v.byAccountType], ['custodian', v.byCustodian]] as const) {
      expect(rows.reduce((s, r) => s + r.value, 0), name).toBeCloseTo(v.book.value, 4)
    }
    expect(v.byAccountType.reduce((s, r) => s + r.accounts, 0)).toBe(47)
    expect(v.bySegment.reduce((s, r) => s + r.annualFee, 0)).toBeCloseTo(v.revenue.annual, 6)
    expect(v.bySegment.find((s) => s.segment === 'platinum')).toMatchObject({ households: 3 })
    expect(Math.round(v.bySegment.find((s) => s.segment === 'platinum')?.value ?? 0)).toBe(58_558_018)
  })

  it('derives tenure from when each household joined', () => {
    const v = view()
    expect(v.tenure.reduce((s, t) => s + t.households, 0)).toBe(households.length)
    expect(v.tenure.map((t) => t.bucket)).toEqual(['Under 1 year', '1 to 3 years', '3 to 5 years', '5 to 10 years', '10 years or more'])
    expect(v.households.find((h) => h.householdId === 'hh-013')?.since).toBe('2024-03-15')
  })

  it("states concentration as the largest clients' share of revenue, top three and top five, from the table's own shares", () => {
    const { concentration, households } = view()
    const shares = households.map((h) => h.shareOfRevenue).sort((a, b) => b - a)
    const top = (n: number) => shares.slice(0, n).reduce((s, x) => s + x, 0)
    expect(concentration).toEqual({ top3Share: top(3), top5Share: top(5) })
    expect(concentration.top3Share).toBeGreaterThan(0.5)
    expect(concentration.top5Share).toBeLessThanOrEqual(1)
  })

  it("lists households by value, each one's share of revenue summing to one", () => {
    const rows = view().households
    expect(rows.map((r) => r.value)).toEqual([...rows.map((r) => r.value)].sort((a, b) => b - a))
    expect(rows.reduce((s, r) => s + r.shareOfRevenue, 0)).toBeCloseTo(1, 12)
  })

  it('carries none of the removed hand-typed figures', () => {
    const source = readFileSync('src/mocks/reference/practice.ts', 'utf8')
    expect(source).not.toMatch(/Lisa Park|PLANNING_REVENUE|revenueGrowthYoY|growthTrend|topGrowth|aumWaterfall|targetClients/)
  })

  it('is firm only, and quotes a household', () => {
    expect(practiceView('cli-001')).toBeUndefined()
    expect(practiceView('prsp-011')).toBeUndefined()
    const q = practiceQuote('hh-001')
    expect(q).toMatchObject({ view: 'practice', subject: { type: 'household', id: 'hh-001' }, threadTitle: 'Practice · Johnson Household' })
    expect(q?.claim).not.toMatch(/\d/)
    expect(practiceQuote('hh-999')).toBeUndefined()
  })
})
