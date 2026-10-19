import type { MethodNote, RowQuote } from '@/types/reference'
import type { PracticeHousehold, PracticeView } from '@/types/reference-practice'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { accountValueUSD, deriveBookAUM } from '@/lib/aum'
import { ACCOUNT_TYPE_LABELS } from '@/lib/labels'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { billingRuns, householdBillings } from './billing'

const YEAR_MS = 365.25 * 86_400_000
const TENURE: readonly { bucket: string; under: number }[] = [
  { bucket: 'Under 1 year', under: 1 }, { bucket: '1 to 3 years', under: 3 }, { bucket: '3 to 5 years', under: 5 },
  { bucket: '5 to 10 years', under: 10 }, { bucket: '10 years or more', under: Number.POSITIVE_INFINITY },
]

/** Sums `value` (and counts) by a key, largest value first. */
function groupBy<T>(rows: readonly T[], key: (row: T) => string, value: (row: T) => number): { key: string; count: number; value: number }[] {
  const groups = new Map<string, { count: number; value: number }>()
  for (const row of rows) {
    const g = groups.get(key(row)) ?? { count: 0, value: 0 }
    groups.set(key(row), { count: g.count + 1, value: g.value + value(row) })
  }
  return [...groups].map(([k, g]) => ({ key: k, ...g })).sort((a, b) => b.value - a.value)
}

function practiceHouseholds(): PracticeHousehold[] {
  const billed = householdBillings()
  const revenue = billed.reduce((s, b) => s + b.annualFee, 0)
  return households.map((h) => {
    const b = billed.find((x) => x.householdId === h.id)
    if (!b) throw new Error(`Household ${h.id} is not billed`)
    return { householdId: h.id, name: h.name, segment: h.segment, since: h.createdAt, value: b.value, annualFee: b.annualFee, effectiveRate: b.effectiveRate, shareOfRevenue: b.annualFee / revenue }
  }).sort((a, b) => b.value - a.value)
}

const METHODS: readonly MethodNote[] = [
  { label: 'Revenue', modeled: false, text: "Annual advisory revenue is the billing view's fees on today's value: the firm's tiered schedule on each household's combined value. The effective fee is that revenue over the book's value, in basis points. Flat planning fees are not in the book and are not shown." },
  { label: 'Latest run', modeled: true, text: "Modeled, not realized: the latest billing run's total rests on quarter-end values drawn from each account's modeled performance series." },
  { label: 'Book', modeled: false, text: "Value, households, clients and accounts are counted from the accounts in the book; an account held in another currency is converted at today's exchange rate." },
  { label: 'Tenure', modeled: false, text: 'Years since each household joined the firm, to today.' },
  { label: 'Concentration', modeled: false, text: "The largest clients' share of annual revenue: the three and the five households with the largest fees, each household's fee over the firm's annual revenue, as the table states them. Revenue is the advisory fee billed on assets the firm manages; held-away assets carry no fee and are not in it. The figures count households, not named clients." },
]

export function practiceView(viewerId: string): PracticeView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const rows = practiceHouseholds()
  const bookValue = deriveBookAUM(accounts, FX_RATES_USD_BASE)
  const annual = rows.reduce((s, r) => s + r.annualFee, 0)
  const [latest] = billingRuns()
  if (!latest) throw new Error('The firm has no billing run')
  const byRevenue = rows.map((r) => r.shareOfRevenue).sort((a, b) => b - a)
  const topShare = (n: number) => byRevenue.slice(0, n).reduce((s, x) => s + x, 0)
  const usd = (a: (typeof accounts)[number]) => accountValueUSD(a, FX_RATES_USD_BASE)
  return {
    asOf: MOCK_NOW_ISO,
    book: { value: bookValue, households: households.length, clients: new Set(accounts.map((a) => a.clientId)).size, accounts: accounts.length },
    revenue: { annual, effectiveRate: annual / bookValue, lastRun: { id: latest.id, runDate: latest.runDate, total: latest.total } },
    bySegment: groupBy(rows, (r) => r.segment, (r) => r.value).map((g) => {
      const fees = rows.filter((r) => r.segment === g.key).reduce((s, r) => s + r.annualFee, 0)
      return { segment: g.key, households: g.count, value: g.value, annualFee: fees, effectiveRate: fees / g.value }
    }),
    byAccountType: groupBy(accounts, (a) => ACCOUNT_TYPE_LABELS[a.type], usd).map((g) => ({ type: g.key, accounts: g.count, value: g.value })),
    byCustodian: groupBy(accounts, (a) => a.custodian, usd).map((g) => ({ custodian: g.key, accounts: g.count, value: g.value })),
    tenure: TENURE.map(({ bucket, under }, i) => ({
      bucket,
      households: households.filter((h) => {
        const years = (Date.parse(MOCK_TODAY_ISO) - Date.parse(h.createdAt)) / YEAR_MS
        return years < under && years >= (TENURE[i - 1]?.under ?? 0)
      }).length,
    })),
    concentration: { top3Share: topShare(3), top5Share: topShare(5) },
    households: rows,
    methods: [...METHODS],
  }
}

export function practiceQuote(householdId: string): RowQuote | undefined {
  const row = practiceHouseholds().find((r) => r.householdId === householdId)
  if (!row) return undefined
  return {
    view: 'practice', rowId: row.householdId, subject: { type: 'household', id: row.householdId }, threadTitle: `Practice · ${row.name}`,
    claim: `${row.name} in the book: its value, its fees and its share of the firm's revenue.`,
    figures: [
      { label: 'Value today', value: row.value, unit: 'USD', source: 'practice.households.value' },
      { label: 'Annual fee', value: row.annualFee, unit: 'USD', source: 'practice.households.annualFee' },
      { label: 'Share of revenue', value: row.shareOfRevenue, unit: '%', source: 'practice.households.shareOfRevenue' },
    ],
    citations: [{ source: "Practice · billing's fees on today's value", asOf: MOCK_NOW_ISO }],
  }
}
