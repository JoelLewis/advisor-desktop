import { MetricsBar } from './MetricsBar'
import { NBAQuickView } from './NBAQuickView'
import { SchedulePanel } from './SchedulePanel'
import { ActivityStream } from './ActivityStream'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { useAIInsights } from '@/hooks/use-ai'
import { useMetrics } from '@/hooks/use-metrics'
import { now } from '@/lib/clock'

function formatToday(): string {
  return now().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function getGreeting(): string {
  const hour = now().getUTCHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { data: insights } = useAIInsights('dashboard')
  const { data: metrics } = useMetrics()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title">{getGreeting()}, Sarah</h1>
        <p className="mt-1 text-body text-text-secondary">
          {formatToday()}
          {metrics ? ` — ${metrics.meetingsToday} meetings, ${metrics.pendingTasks} pending actions` : ''}
        </p>
      </div>

      <div data-annotation="dash-metrics"><MetricsBar /></div>

      {insights && insights.length > 0 && (
        <div data-annotation="dash-ai-insights"><AIInsightStack insights={insights} /></div>
      )}

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2" data-annotation="dash-nba">
          <NBAQuickView />
        </div>
        <div id="schedule-panel" data-annotation="dash-schedule"><SchedulePanel /></div>
      </div>

      <div className="mt-4">
        <ActivityStream />
      </div>
    </div>
  )
}
