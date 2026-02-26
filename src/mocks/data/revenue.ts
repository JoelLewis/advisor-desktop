import type { FeeSchedule, BillingRecord, RevenueMetrics, RevenueTrend, RevenueBySegment } from '@/types/revenue'

// ── Fee Schedules ──
// AUM-based rates: 0.75% platinum (large), 0.85% gold (mid-large), 1.0% silver (mid), 1.25% bronze (small)
// Annual revenue = managedAUM * rate (for AUM-based)
export const feeSchedules: FeeSchedule[] = [
  // Platinum tier (3 households)
  { id: 'fee-001', householdId: 'hh-001', householdName: 'Johnson Household', feeType: 'aum_based', rate: 0.0075, annualRevenue: 140_625, tier: 'platinum' },    // $18.75M * 0.75%
  { id: 'fee-002', householdId: 'hh-002', householdName: 'Chen-Wong Household', feeType: 'aum_based', rate: 0.0075, annualRevenue: 211_500, tier: 'platinum' },   // $28.2M * 0.75%
  { id: 'fee-003', householdId: 'hh-004', householdName: 'Martinez Household', feeType: 'aum_based', rate: 0.0075, annualRevenue: 71_250, tier: 'platinum' },     // $9.5M * 0.75%

  // Gold tier (4 households)
  { id: 'fee-004', householdId: 'hh-003', householdName: 'Williams Household', feeType: 'aum_based', rate: 0.0085, annualRevenue: 52_275, tier: 'gold' },         // $6.15M * 0.85%
  { id: 'fee-005', householdId: 'hh-005', householdName: 'Thompson Household', feeType: 'aum_based', rate: 0.0085, annualRevenue: 33_150, tier: 'gold' },         // $3.9M * 0.85%
  { id: 'fee-006', householdId: 'hh-006', householdName: 'Anderson Household', feeType: 'aum_based', rate: 0.0085, annualRevenue: 61_200, tier: 'gold' },         // $7.2M * 0.85%
  { id: 'fee-007', householdId: 'hh-007', householdName: 'Patel Household', feeType: 'aum_based', rate: 0.0085, annualRevenue: 49_300, tier: 'gold' },            // $5.8M * 0.85%

  // Silver tier (3 households)
  { id: 'fee-008', householdId: 'hh-008', householdName: "O'Brien Household", feeType: 'aum_based', rate: 0.01, annualRevenue: 16_500, tier: 'silver' },          // $1.65M * 1.0%
  { id: 'fee-009', householdId: 'hh-009', householdName: 'Kim-Lee Household', feeType: 'aum_based', rate: 0.01, annualRevenue: 10_500, tier: 'silver' },           // $1.05M * 1.0%
  { id: 'fee-010', householdId: 'hh-011', householdName: 'Foster Household', feeType: 'aum_based', rate: 0.01, annualRevenue: 15_000, tier: 'silver' },            // $1.5M * 1.0%

  // Bronze tier (2 households)
  { id: 'fee-011', householdId: 'hh-010', householdName: 'Garcia Household', feeType: 'aum_based', rate: 0.0125, annualRevenue: 9_000, tier: 'bronze' },           // $720K * 1.25%
  { id: 'fee-012', householdId: 'hh-012', householdName: 'Taylor Household', feeType: 'aum_based', rate: 0.0125, annualRevenue: 4_750, tier: 'bronze' },           // $380K * 1.25%
]

// ── Billing Records ──
// 12 months: 2025-03 through 2026-02
// Monthly amount = annualRevenue / 12, with slight variation
function generateBillingRecords(): BillingRecord[] {
  const records: BillingRecord[] = []
  const periods = [
    '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08',
    '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
  ]

  let recordId = 1
  for (const fee of feeSchedules) {
    const monthlyBase = fee.annualRevenue / 12

    for (const period of periods) {
      // Deterministic variation: use char codes from householdId + period
      const seed = fee.householdId.charCodeAt(3) + period.charCodeAt(5)
      const variation = 1 + ((seed % 7) - 3) * 0.005 // ±1.5% variation
      const amount = Math.round(monthlyBase * variation * 100) / 100

      // Status: older months collected, current month pending, one overdue for realism
      let status: BillingRecord['status'] = 'collected'
      if (period === '2026-02') {
        status = 'pending'
      } else if (period === '2026-01' && fee.householdId === 'hh-012') {
        status = 'overdue' // Taylor household has an overdue payment
      }

      records.push({
        id: `bill-${String(recordId).padStart(3, '0')}`,
        householdId: fee.householdId,
        period,
        amount,
        feeType: fee.feeType,
        status,
      })
      recordId++
    }
  }

  return records
}

export const billingRecords: BillingRecord[] = generateBillingRecords()

// ── Revenue Metrics ──
// Total annual ~$675K from fee schedules, add planning fees to reach ~$800K
const totalFromFees = feeSchedules.reduce((sum, f) => sum + f.annualRevenue, 0) // ~$675,050
const planningRevenue = 124_950 // Additional planning/flat fees to reach ~$800K target

export const revenueMetrics: RevenueMetrics = {
  totalRecurringRevenue: totalFromFees + planningRevenue, // ~$800,000
  mtdRevenue: 68_420,    // February MTD (partial month)
  ytdRevenue: 135_280,   // Jan + Feb partial
  avgRevenuePerHousehold: Math.round((totalFromFees + planningRevenue) / 12),
  revenueGrowthYoY: 8.3, // 8.3% YoY growth
}

// ── Revenue Trend ──
// 12-month trend with gradual growth + optional projection for future months
export const revenueTrend: RevenueTrend[] = [
  { period: '2025-03', revenue: 61_200 },
  { period: '2025-04', revenue: 62_450 },
  { period: '2025-05', revenue: 61_800 },
  { period: '2025-06', revenue: 63_100 },
  { period: '2025-07', revenue: 62_900 },
  { period: '2025-08', revenue: 64_200 },
  { period: '2025-09', revenue: 63_750 },
  { period: '2025-10', revenue: 65_100 },
  { period: '2025-11', revenue: 64_800 },
  { period: '2025-12', revenue: 66_300 },
  { period: '2026-01', revenue: 66_860 },
  { period: '2026-02', revenue: 68_420 },
  { period: '2026-03', revenue: 67_500, projected: 69_200 },
  { period: '2026-04', revenue: 0, projected: 70_100 },
  { period: '2026-05', revenue: 0, projected: 71_000 },
]

// ── Revenue by Segment ──
export const revenueBySegment: RevenueBySegment[] = [
  { segment: 'platinum', revenue: 423_375, clientCount: 3 },  // Johnson + Chen-Wong + Martinez
  { segment: 'gold', revenue: 195_925, clientCount: 4 },      // Williams + Thompson + Anderson + Patel
  { segment: 'silver', revenue: 42_000, clientCount: 3 },     // O'Brien + Kim-Lee + Foster
  { segment: 'bronze', revenue: 13_750, clientCount: 2 },     // Garcia + Taylor
]
