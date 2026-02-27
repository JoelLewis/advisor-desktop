import { MetricsBar } from './MetricsBar'
import { NBAQuickView } from './NBAQuickView'
import { SchedulePanel } from './SchedulePanel'
import { ActivityStream } from './ActivityStream'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { useAIInsights } from '@/hooks/use-ai'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function DashboardPage() {
  const { data: insights } = useAIInsights('dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">{getGreeting()}, Sarah</h1>
        <p className="mt-1 text-body text-text-secondary">
          Tuesday, February 25, 2026 — 4 meetings, 14 pending actions
        </p>
      </div>

      <MetricsBar />

      {insights && insights.length > 0 && (
        <AIInsightStack insights={insights} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <NBAQuickView />
        </div>
        <div id="schedule-panel"><SchedulePanel /></div>
      </div>

      <ActivityStream />
    </div>
  )
}
