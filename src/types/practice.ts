type TeamMemberRole = 'advisor' | 'csa' | 'analyst' | 'compliance'

type TeamMemberActivity = {
  memberId: string
  memberName: string
  role: TeamMemberRole
  activeTasks: number
  completedThisWeek: number
  pendingTasks: number
  currentFocus: string
}

type BookAnalytics = {
  aumBySegment: { segment: string; aum: number; count: number }[]
  aumByAccountType: { type: string; aum: number; count: number }[]
  clientTenure: { bucket: string; count: number }[]
  growthTrend: { period: string; newClients: number; attrition: number; netNew: number }[]
  topGrowthHouseholds: { householdId: string; name: string; aumGrowth: number; growthPct: number }[]
}

export type { TeamMemberRole, TeamMemberActivity, BookAnalytics }
