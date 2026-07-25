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
      label: 'Pending tasks',
      value: String(data.pendingTasks),
      change: { value: `${data.criticalCount} critical`, direction: 'neutral' },
      onClick: () => navigate('/workflows'),
    },
    {
      label: 'Meetings today',
      value: String(data.meetingsToday),
      onClick: () =>
        document
          .getElementById('schedule-panel')
          ?.scrollIntoView({ behavior: 'smooth' }),
    },
    {
      label: 'Alerts',
      value: String(data.alertCount),
      onClick: () => navigate('/actions'),
    },
    {
      label: `Net flows MTD${currencyLabel}`,
      value: formatWithConversion(data.netFlowsMTD, 'USD', { compact: true }),
      onClick: () => navigate('/portfolios'),
    },
  ]

  return <DenseMetricsBar metrics={metrics} />
}
