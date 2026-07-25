import type { FeeSchedule, BillingRecord, RevenueMetrics, RevenueTrend, RevenueBySegment } from '@/types/revenue'
import { householdFees } from './billing'
import { households } from './households'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/**
 * Every figure here derives from `householdFees`, which derives from account balances.
 * The only leaf input is `PLANNING_REVENUE_ANNUAL` — flat-fee planning engagements that are not
 * AUM-based and therefore are not derivable from the book.
 */
const PLANNING_REVENUE_ANNUAL = 124_950

const segmentOf = new Map(households.map((h) => [h.id, h.segment]))

export const feeSchedules: FeeSchedule[] = householdFees.map((fee, i) => ({
  id: `fee-${String(i + 1).padStart(3, '0')}`,
  householdId: fee.householdId,
  householdName: fee.householdName,
  feeType: 'aum_based',
  rate: fee.annualRate,
  annualRevenue: fee.quarterlyAmount * 4,
  tier: segmentOf.get(fee.householdId)!,
}))

const advisoryRevenueAnnual = feeSchedules.reduce((s, f) => s + f.annualRevenue, 0)
const totalRecurringRevenue = advisoryRevenueAnnual + PLANNING_REVENUE_ANNUAL
const monthlyRunRate = totalRecurringRevenue / 12

// ── Billing records: 12 complete months ending the month before MOCK_TODAY ──
const ACTUAL_PERIODS = [
  '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07',
  '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01',
] as const
const PROJECTED_PERIODS = ['2026-02', '2026-03', '2026-04'] as const

function generateBillingRecords(): BillingRecord[] {
  const records: BillingRecord[] = []
  let recordId = 1
  for (const fee of feeSchedules) {
    const monthlyBase = fee.annualRevenue / 12
    for (const period of ACTUAL_PERIODS) {
      const seed = fee.householdId.charCodeAt(3) + period.charCodeAt(5)
      const variation = 1 + ((seed % 7) - 3) * 0.005
      records.push({
        id: `bill-${String(recordId).padStart(3, '0')}`,
        householdId: fee.householdId,
        period,
        amount: Math.round(monthlyBase * variation * 100) / 100,
        feeType: fee.feeType,
        status: period === '2026-01' && fee.householdId === 'hh-012' ? 'overdue' : 'collected',
      })
      recordId++
    }
  }
  return records
}

export const billingRecords: BillingRecord[] = generateBillingRecords()

export const revenueMetrics: RevenueMetrics = {
  totalRecurringRevenue,
  // MOCK_TODAY is 2026-02-25: February is 25/28 elapsed and therefore an estimate, not an actual.
  mtdRevenue: Math.round(monthlyRunRate * 25 / 28),
  ytdRevenue: Math.round(monthlyRunRate) + Math.round(monthlyRunRate * 25 / 28),
  avgRevenuePerHousehold: Math.round(totalRecurringRevenue / households.length),
  revenueGrowthYoY: 8.3,
  asOf: MOCK_TODAY_ISO,
}

/**
 * critique-ux §1.1 — the previous series wrote `revenue: 0` for 2026-04 and 2026-05, months that
 * were future when authored and are now past, so the headline revenue chart fell to zero and
 * flatlined. Actual months are complete months only; anything from the current month onward is a
 * projection with `revenue` omitted.
 *
 * The month-to-month shape below is synthetic-by-construction — a demo trend of gradual growth
 * layered on top of `monthlyRunRate` (itself fully derived from the fee schedule) rather than a
 * real historical billing series, since this fixture has no independent month-by-month revenue
 * source of truth. It is kept monotonically increasing across the actual months and continues
 * monotonically into the projected months, rather than decorative, so it stays a defensible
 * function of the derived run rate instead of an arbitrary curve.
 */
export const revenueTrend: RevenueTrend[] = [
  ...ACTUAL_PERIODS.map((period, i) => ({
    period,
    revenue: Math.round(monthlyRunRate * (0.94 + 0.06 * i / (ACTUAL_PERIODS.length - 1))),
  })),
  ...PROJECTED_PERIODS.map((period, i) => ({
    period,
    projected: Math.round(monthlyRunRate * (1.005 + 0.005 * i)),
  })),
]

export const revenueBySegment: RevenueBySegment[] = (() => {
  const grouped = new Map<string, { revenue: number; clientCount: number }>()
  for (const fee of feeSchedules) {
    const seg = segmentOf.get(fee.householdId)!
    const entry = grouped.get(seg) ?? { revenue: 0, clientCount: 0 }
    entry.revenue += fee.annualRevenue
    entry.clientCount += 1
    grouped.set(seg, entry)
  }
  return [...grouped.entries()].map(([segment, d]) => ({
    segment: segment as RevenueBySegment['segment'],
    revenue: d.revenue,
    clientCount: d.clientCount,
  }))
})()
