import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/Skeleton'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import { useMetrics } from '@/hooks/use-metrics'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import type { DenseMetric } from '@/components/ui/DenseMetricsBar'

export function MetricsBar() {
  const { data, isLoading } = useMetrics()
  const navigate = useNavigate()
  const { formatWithConversion, reportingCurrency } = useFormatCurrency()

  if (isLoading) {
    return <Skeleton className="h-[52px] w-full rounded-lg" />
  }

  if (!data) {
    return (
      <div className="py-3 text-center text-caption text-text-tertiary">
        Unable to load metrics
      </div>
    )
  }

  const currencyLabel = reportingCurrency !== 'USD' ? ` (${reportingCurrency})` : ''

  const metrics: DenseMetric[] = [
    {
      label: `Total AUM${currencyLabel}`,
      value: formatWithConversion(data.totalAUM, 'USD', { compact: true }),
      change: { value: '+2.3% MTD', direction: 'up' },
      onClick: () => navigate('/portfolios'),
    },
    {
      label: 'Pending Tasks',
      value: String(data.pendingTasks),
      change: { value: '3 due today', direction: 'neutral' },
      onClick: () => navigate('/workflows'),
    },
    {
      label: 'Meetings Today',
      value: String(data.meetingsToday),
      onClick: () =>
        document
          .getElementById('schedule-panel')
          ?.scrollIntoView({ behavior: 'smooth' }),
    },
    {
      label: 'Alerts',
      value: String(data.alertCount),
      change: { value: '1 critical', direction: 'down' },
      onClick: () => navigate('/actions'),
    },
    {
      label: `Net Flows MTD${currencyLabel}`,
      value: formatWithConversion(data.netFlowsMTD, 'USD', { compact: true }),
      change: { value: '+$1.2M', direction: 'up' },
      onClick: () => navigate('/portfolios'),
    },
  ]

  return <DenseMetricsBar metrics={metrics} />
}
