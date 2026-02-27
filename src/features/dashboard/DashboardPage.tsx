import { MetricsBar } from './MetricsBar'
import { NBAQuickView } from './NBAQuickView'
import { SchedulePanel } from './SchedulePanel'
import { ActivityStream } from './ActivityStream'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { useAIInsights } from '@/hooks/use-ai'

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function DashboardPage() {
  const { data: insights } = useAIInsights('dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Good Morning, Sarah</h1>
        <p className="mt-1 text-body text-text-secondary">
          {formatToday()} — 4 meetings, 14 pending actions
        </p>
      </div>

      <div data-annotation="dash-metrics"><MetricsBar /></div>

      {insights && insights.length > 0 && (
        <div data-annotation="dash-ai-insights"><AIInsightStack insights={insights} /></div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2" data-annotation="dash-nba">
          <NBAQuickView />
        </div>
        <div id="schedule-panel" data-annotation="dash-schedule"><SchedulePanel /></div>
      </div>

      <ActivityStream />
    </div>
  )
}
