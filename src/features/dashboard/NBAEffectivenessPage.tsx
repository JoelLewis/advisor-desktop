import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import type { DenseMetric } from '@/components/ui/DenseMetricsBar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { CATEGORY_CONFIG } from '@/components/ui/NBACard'
import { useNBAEffectiveness } from '@/hooks/use-nbas'
import { cn } from '@/lib/utils'
import { useFormatCurrency } from '@/hooks/use-format-currency'
export function NBAEffectivenessPage() {
  const { data: metrics, isLoading } = useNBAEffectiveness()
  const { formatWithConversion } = useFormatCurrency()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!metrics) return <div className="py-12 text-center text-caption text-text-tertiary">Unable to load NBA effectiveness data</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-page-title text-text-primary">NBA Effectiveness</h1>
          <p className="text-caption text-text-secondary">Performance metrics for the Next Best Action system</p>
        </div>
      </div>

      {/* Top-level metrics */}
      <DenseMetricsBar metrics={[
        {
          label: 'Total Actions',
          value: metrics.totalActions.toString(),
          change: { value: 'Last 6 months', direction: 'neutral' },
        },
        {
          label: 'Acceptance Rate',
          value: `${metrics.acceptanceRate}%`,
          change: { value: metrics.acceptanceRate >= 65 ? 'Above target' : 'Below 65% target', direction: metrics.acceptanceRate >= 65 ? 'up' : 'down' },
        },
        {
          label: 'Avg Time-to-Action',
          value: `${metrics.avgTimeToAction.toFixed(0)}h`,
          change: { value: metrics.avgTimeToAction <= 48 ? 'Within SLA' : 'Above 48h SLA', direction: metrics.avgTimeToAction <= 48 ? 'up' : 'down' },
        },
        {
          label: 'Compliance',
          value: `${metrics.complianceCompletionRate}%`,
          change: { value: metrics.complianceCompletionRate >= 95 ? 'Meeting target' : 'Below 95% target', direction: metrics.complianceCompletionRate >= 95 ? 'up' : 'down' },
        },
        {
          label: 'Revenue Impact',
          value: formatWithConversion(metrics.estimatedRevenueImpact, 'USD', { compact: true }),
          change: { value: 'From accepted actions', direction: 'up' },
        },
      ] satisfies DenseMetric[]} />

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Trend chart */}
        <Card>
          <CardHeader>Acceptance Trend (6 Months)</CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.trend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="accepted" fill="#059669" name="Accepted" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dismissed" fill="#DC2626" name="Dismissed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion rate trend */}
        <Card>
          <CardHeader>Completion Rate & Revenue Impact</CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={metrics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} domain={[0, 100]} unit="%" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                <RechartsTooltip formatter={(value: number, name: string) => name === 'Revenue Impact' ? formatWithConversion(value, 'USD', { compact: true }) : `${value}%`} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="completionRate" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} name="Completion Rate" />
                <Line yAxisId="right" type="monotone" dataKey="revenueImpact" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} name="Revenue Impact" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader>Effectiveness by Category</CardHeader>
        <CardContent>
          <div className="space-y-3 overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-2 text-caption font-medium text-text-tertiary px-2 min-w-[700px]">
              <span className="col-span-2">Category</span>
              <span className="text-right">Total</span>
              <span className="text-right">Accepted</span>
              <span className="text-right">Dismissed</span>
              <span className="text-right">Avg Time</span>
              <span className="text-right">Accept Rate</span>
              <span className="text-right">Revenue</span>
            </div>
            {/* Category rows */}
            {metrics.byCategory.map((cat) => {
              const config = CATEGORY_CONFIG[cat.category]
              const acceptRate = cat.total > 0 ? (cat.accepted / cat.total * 100) : 0
              return (
                <div key={cat.category} className="grid grid-cols-8 gap-2 items-center rounded-md px-2 py-2 transition-colors hover:bg-surface-tertiary min-w-[700px]">
                  <div className="col-span-2 flex items-center gap-2">
                    <Badge variant={config.variant}>
                      <config.icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <span className="text-right font-mono text-body">{cat.total}</span>
                  <span className="text-right font-mono text-body text-accent-green">{cat.accepted}</span>
                  <span className="text-right font-mono text-body text-accent-red">{cat.dismissed}</span>
                  <span className="text-right font-mono text-caption text-text-secondary">{cat.avgTimeToAction.toFixed(0)}h</span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-surface-tertiary">
                      <div
                        className={cn('h-1.5 rounded-full', acceptRate >= 65 ? 'bg-accent-green' : acceptRate >= 40 ? 'bg-amber-500' : 'bg-accent-red')}
                        style={{ width: `${Math.min(acceptRate, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-caption">{acceptRate.toFixed(0)}%</span>
                  </div>
                  <span className="text-right font-mono text-caption text-text-secondary">
                    {cat.revenueImpact > 0 ? formatWithConversion(cat.revenueImpact, 'USD', { compact: true }) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
