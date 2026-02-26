import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMetrics } from '@/hooks/use-metrics'
import { formatCurrency } from '@/lib/utils'

export function MetricsBar() {
  const { data, isLoading } = useMetrics()

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px]" />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid grid-cols-5 gap-4">
      <MetricCard
        label="Total AUM"
        value={formatCurrency(data.totalAUM, true)}
        change={{ value: '+2.3% MTD', direction: 'up' }}
      />
      <MetricCard
        label="Pending Tasks"
        value={String(data.pendingTasks)}
        change={{ value: '3 due today', direction: 'neutral' }}
      />
      <MetricCard
        label="Meetings Today"
        value={String(data.meetingsToday)}
      />
      <MetricCard
        label="Alerts"
        value={String(data.alertCount)}
        change={{ value: '1 critical', direction: 'down' }}
      />
      <MetricCard
        label="Net Flows MTD"
        value={formatCurrency(data.netFlowsMTD, true)}
        change={{ value: '+$1.2M', direction: 'up' }}
      />
    </div>
  )
}
