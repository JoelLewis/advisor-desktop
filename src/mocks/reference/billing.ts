import type { Account } from '@/types/account'
import type { PerformanceSeries } from '@/types/performance'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { BillingException, BillingMethod, BillingRun, BillingRunDate, BillingView, HouseholdBilling } from '@/types/reference-billing'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { BILLING_EXCEPTIONS, BILLING_RUNS, FEE_TERMS } from '@/mocks/data/billing'
import { FIRM_FEE_SCHEDULE, feeOn } from '@/mocks/data/fee-schedule'
import { performanceSeriesFor } from '@/mocks/handlers/pms'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { accountValueUSD, deriveHouseholdAUM } from '@/lib/aum'
import { tierSlices } from '@/lib/fees'
import { MOCK_NOW_ISO } from '@/lib/clock'

type Household = (typeof households)[number]

export { FIRM_FEE_SCHEDULE }

export const annualFeeOn = (value: number): number => feeOn(value).fee

export function billingMethodOf(householdId: string): BillingMethod {
  const terms = FEE_TERMS.find((t) => t.householdId === householdId)
  if (!terms) throw new Error(`Household ${householdId} has no fee terms`)
  return terms.method
}

function householdName(householdId: string): string {
  const household = households.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  return household.name
}

// The fixtures-book series never changes in a session, so each account's is drawn once.
const fixturesSeries = new Map<string, readonly PerformanceSeries[]>()
function seriesOf(account: Account): readonly PerformanceSeries[] {
  const known = fixturesSeries.get(account.id)
  if (known) return known
  const drawn = performanceSeriesFor(account, 'fixtures')
  fixturesSeries.set(account.id, drawn)
  return drawn
}

/**
 * Modeled, not realized (R3): today's USD value scaled by the account's fixtures-book series, linearly
 * interpolated between the two monthly points around `day`. The demo keeps no price history.
 */
export function modeledAccountValueAt(account: Account, day: string): number {
  const series = seriesOf(account)
  const last = series[series.length - 1]
  const after = series.findIndex((p) => p.date >= day)
  const before = after > 0 ? series[after - 1] : undefined
  const next = after > 0 ? series[after] : undefined
  if (!last || !before || !next) throw new Error(`The modeled series for ${account.id} does not reach ${day}`)
  const t = (Date.parse(day) - Date.parse(before.date)) / (Date.parse(next.date) - Date.parse(before.date))
  return (accountValueUSD(account, FX_RATES_USD_BASE) * (before.value + (next.value - before.value) * t)) / last.value
}

function householdBilling(h: Household): HouseholdBilling {
  const value = deriveHouseholdAUM(h.id, accounts, FX_RATES_USD_BASE)
  const tiers = tierSlices(value, FIRM_FEE_SCHEDULE.tiers)
  const annualFee = annualFeeOn(value)
  const inside = tiers.findIndex((t) => t.upTo !== null && value < t.upTo)
  const boundary = inside >= 0 ? tiers[inside]?.upTo : undefined
  const following = inside >= 0 ? FIRM_FEE_SCHEDULE.tiers[inside + 1] : undefined
  return {
    householdId: h.id, householdName: h.name, segment: h.segment, method: billingMethodOf(h.id),
    value, annualFee, quarterlyFee: annualFee / 4, effectiveRate: value > 0 ? annualFee / value : 0, tiers,
    ...(typeof boundary === 'number' && following ? { nextTier: { at: boundary, rate: following.rate } } : {}),
    openExceptionIds: BILLING_EXCEPTIONS.filter((e) => e.householdId === h.id && !e.resolvedAt).map((e) => e.id),
  }
}

export function householdBillings(): HouseholdBilling[] {
  return households.map(householdBilling)
}

function runOf(run: BillingRunDate): BillingRun {
  const rows = households.map((h) => {
    const method = billingMethodOf(h.id)
    const valuation = accounts
      .filter((a) => a.householdId === h.id && a.openDate <= run.valuationDate)
      .reduce((s, a) => s + modeledAccountValueAt(a, run.valuationDate), 0)
    return { householdId: h.id, householdName: h.name, method, covers: method === 'advance' ? run.advanceQuarter : run.arrearsQuarter, valuation, fee: annualFeeOn(valuation) / 4 }
  })
  return {
    ...run, households: rows, total: rows.reduce((s, r) => s + r.fee, 0),
    exceptionIds: BILLING_EXCEPTIONS.filter((e) => e.runId === run.id).map((e) => e.id),
  }
}

/** The quarterly runs, newest first. */
export function billingRuns(): BillingRun[] {
  return [...BILLING_RUNS].sort((a, b) => b.runDate.localeCompare(a.runDate)).map(runOf)
}

function scheduleRows(): BillingView['schedule']['tiers'] {
  let from = 0
  return FIRM_FEE_SCHEDULE.tiers.map((t) => {
    const row = { from, upTo: t.upTo, rate: t.rate }
    from = t.upTo ?? from
    return row
  })
}

const exceptions = (): BillingException[] => BILLING_EXCEPTIONS.map((e) => ({ ...e, householdName: householdName(e.householdId) }))

const METHODS: readonly MethodNote[] = [
  { label: 'Schedule', modeled: false, text: "Every household is billed on the firm's tiered schedule, the schedule Form ADV Part 2A discloses, on the combined value of its accounts. Each tier's rate applies only to the slice of value inside that tier." },
  { label: "Today's fees", modeled: false, text: "Value is each account's value today, from the book; an account held in another currency is converted at today's exchange rate. The annual fee is the schedule on that value; the quarterly fee is a quarter of it." },
  { label: 'Billing runs', modeled: false, text: 'The firm bills on the first trading day of each quarter, on the value at the quarter end before it. A household whose agreement bills in advance pays for the coming quarter; one whose agreement bills in arrears pays for the quarter just ended, on the same valuation. An account counts only if it was open by the valuation date.' },
  { label: 'Quarter-end values', modeled: true, text: "Modeled, not realized: the demo keeps no price history, so each account's quarter-end value is today's value scaled by its modeled monthly performance series, drawn from the holdings as the fixtures state them and interpolated between the two monthly points around the quarter end. Today's trades do not rewrite it." },
]

export function billingView(viewerId: string): BillingView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const rows = householdBillings()
  const value = rows.reduce((s, h) => s + h.value, 0)
  const annualFee = rows.reduce((s, h) => s + h.annualFee, 0)
  return {
    asOf: MOCK_NOW_ISO,
    schedule: { name: FIRM_FEE_SCHEDULE.name, tiers: scheduleRows() },
    households: rows,
    totals: { value, annualFee, quarterlyFee: annualFee / 4, effectiveRate: annualFee / value },
    runs: billingRuns(),
    exceptions: exceptions(),
    methods: [...METHODS],
  }
}

export function billingQuote(householdId: string): RowQuote | undefined {
  const household = households.find((h) => h.id === householdId)
  if (!household) return undefined
  const b = householdBilling(household)
  return {
    view: 'billing', rowId: household.id, subject: { type: 'household', id: household.id }, threadTitle: `Billing · ${household.name}`,
    claim: `${household.name} is billed on the firm's tiered schedule, ${b.method === 'advance' ? 'in advance' : 'in arrears'}.`,
    figures: [
      { label: 'Value today', value: b.value, unit: 'USD', source: 'billing.households.value' },
      { label: 'Annual fee', value: b.annualFee, unit: 'USD', source: 'billing.households.annualFee' },
      { label: 'Effective rate', value: b.effectiveRate, unit: '%', source: 'billing.households.effectiveRate' },
    ],
    citations: [{ source: `Billing · ${FIRM_FEE_SCHEDULE.name} schedule on household value`, asOf: MOCK_NOW_ISO }],
  }
}
