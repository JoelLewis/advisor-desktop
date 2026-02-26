type FeeType = 'aum_based' | 'flat' | 'performance' | 'planning'

type FeeSchedule = {
  id: string
  householdId: string
  householdName: string
  feeType: FeeType
  rate: number // percentage for AUM-based, dollar amount for flat
  annualRevenue: number
  tier: 'platinum' | 'gold' | 'silver' | 'bronze'
}

type BillingRecord = {
  id: string
  householdId: string
  period: string // '2026-01', '2026-02', etc.
  amount: number
  feeType: FeeType
  status: 'collected' | 'pending' | 'overdue'
}

type RevenueMetrics = {
  totalRecurringRevenue: number
  mtdRevenue: number
  ytdRevenue: number
  avgRevenuePerHousehold: number
  revenueGrowthYoY: number // percentage
}

type RevenueTrend = {
  period: string
  revenue: number
  projected?: number
}

type RevenueBySegment = {
  segment: string
  revenue: number
  clientCount: number
}

export type { FeeType, FeeSchedule, BillingRecord, RevenueMetrics, RevenueTrend, RevenueBySegment }
