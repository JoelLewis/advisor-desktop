import type { TeamMemberActivity, BookAnalytics } from '@/types/practice'
import { accounts } from './accounts'
import { households } from './households'
import { FX_RATES_USD_BASE } from './currencies'
import { accountValueUSD, deriveSegmentAUM } from '@/lib/aum'

export const teamActivity: TeamMemberActivity[] = [
  {
    memberId: 'tm-001',
    memberName: 'Sarah Mitchell',
    role: 'csa',
    activeTasks: 5,
    completedThisWeek: 8,
    pendingTasks: 3,
    currentFocus: 'Williams onboarding',
  },
  {
    memberId: 'tm-002',
    memberName: 'Mike Chen',
    role: 'analyst',
    activeTasks: 3,
    completedThisWeek: 6,
    pendingTasks: 2,
    currentFocus: 'Q4 performance reports',
  },
  {
    memberId: 'tm-003',
    memberName: 'Lisa Park',
    role: 'compliance',
    activeTasks: 4,
    completedThisWeek: 5,
    pendingTasks: 4,
    currentFocus: 'Annual review prep',
  },
  {
    memberId: 'tm-004',
    memberName: 'Ada',
    role: 'advisor',
    activeTasks: 7,
    completedThisWeek: 12,
    pendingTasks: 5,
    currentFocus: 'Johnson rebalancing review',
  },
]

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  trust_revocable: 'Trust',
  trust_irrevocable: 'Trust',
  traditional_ira: 'IRA',
  roth_ira: 'IRA',
  sep_ira: 'IRA',
  simple_ira: 'IRA',
  inherited_ira: 'IRA',
  '529': '529',
}

function deriveAUMByAccountType(): BookAnalytics['aumByAccountType'] {
  const grouped = new Map<string, { aum: number; count: number }>()
  for (const account of accounts) {
    const label = ACCOUNT_TYPE_LABELS[account.type] ?? 'Other'
    const entry = grouped.get(label) ?? { aum: 0, count: 0 }
    entry.aum += accountValueUSD(account, FX_RATES_USD_BASE)
    entry.count += 1
    grouped.set(label, entry)
  }
  return [...grouped.entries()]
    .map(([type, d]) => ({ type, aum: d.aum, count: d.count }))
    .sort((a, b) => b.aum - a.aum)
}

export const bookAnalytics: BookAnalytics = {
  // critique-ux §1.4 — these were hand-typed and summed to $99,855,000 against a book of
  // $91,320,824, with `Other: 4,855,000` acting as a visible plug on the bar chart. Kept at full
  // float64 precision, unrounded, per lib/aum.ts — rounding for display is a Phase 2 concern.
  aumBySegment: deriveSegmentAUM(households, accounts, FX_RATES_USD_BASE).map((s) => ({
    segment: s.segment as BookAnalytics['aumBySegment'][number]['segment'],
    aum: s.aum,
    count: s.householdCount,
  })),
  aumByAccountType: deriveAUMByAccountType(),
  clientTenure: [
    { bucket: '0-1yr', count: 2 },
    { bucket: '1-3yr', count: 5 },
    { bucket: '3-5yr', count: 4 },
    { bucket: '5-10yr', count: 6 },
    { bucket: '10yr+', count: 3 },
  ],
  growthTrend: [
    { period: '2025-01', newClients: 1, attrition: 0, netNew: 1 },
    { period: '2025-02', newClients: 0, attrition: 0, netNew: 0 },
    { period: '2025-03', newClients: 2, attrition: 1, netNew: 1 },
    { period: '2025-04', newClients: 1, attrition: 0, netNew: 1 },
    { period: '2025-05', newClients: 0, attrition: 0, netNew: 0 },
    { period: '2025-06', newClients: 3, attrition: 1, netNew: 2 },
    { period: '2025-07', newClients: 1, attrition: 0, netNew: 1 },
    { period: '2025-08', newClients: 2, attrition: 0, netNew: 2 },
    { period: '2025-09', newClients: 0, attrition: 1, netNew: -1 },
    { period: '2025-10', newClients: 1, attrition: 0, netNew: 1 },
    { period: '2025-11', newClients: 2, attrition: 0, netNew: 2 },
    { period: '2025-12', newClients: 1, attrition: 1, netNew: 0 },
  ],
  topGrowthHouseholds: [
    { householdId: 'hh-002', name: 'Chen-Wong', aumGrowth: 2_100_000, growthPct: 6.8 },
    { householdId: 'hh-004', name: 'Martinez', aumGrowth: 1_500_000, growthPct: 15.4 },
    { householdId: 'hh-007', name: 'Patel', aumGrowth: 800_000, growthPct: 12.1 },
    { householdId: 'hh-001', name: 'Johnson', aumGrowth: 650_000, growthPct: 2.9 },
    { householdId: 'hh-006', name: 'Anderson', aumGrowth: 550_000, growthPct: 6.8 },
  ],
}
