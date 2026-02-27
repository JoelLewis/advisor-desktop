import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import type { DenseMetric } from '@/components/ui/DenseMetricsBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabLayout } from '@/components/ui/TabLayout'
import { useRevenueMetrics, useFeeSchedules, useRevenueTrend, useRevenueBySegment } from '@/hooks/use-revenue'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { formatPercent } from '@/lib/utils'
import { TeamActivityView } from './TeamActivityView'
import { BookAnalyticsView } from './BookAnalyticsView'
import type { FeeSchedule, RevenueBySegment } from '@/types/revenue'
import type { ColumnDef } from '@tanstack/react-table'

const TIER_VARIANTS: Record<string, 'purple' | 'yellow' | 'default' | 'blue'> = {
  platinum: 'purple',
  gold: 'yellow',
  silver: 'default',
  bronze: 'blue',
}

const SEGMENT_COLORS: Record<string, string> = {
  platinum: '#7C3AED',
  gold: '#D97706',
  silver: '#94A3B8',
  bronze: '#2563EB',
}

const feeColumns: ColumnDef<FeeSchedule, unknown>[] = [
  {
    accessorKey: 'householdName', header: 'Household',
    cell: ({ row }) => <span className="text-body-strong">{row.original.householdName}</span>,
    size: 200,
  },
  {
    accessorKey: 'tier', header: 'Tier',
    cell: ({ row }) => <Badge variant={TIER_VARIANTS[row.original.tier] ?? 'default'}>{row.original.tier}</Badge>,
    size: 100,
  },
  {
    accessorKey: 'feeType', header: 'Fee Type',
    cell: ({ row }) => <span className="text-caption">{row.original.feeType.replace('_', ' ')}</span>,
    size: 100,
  },
  {
    accessorKey: 'rate', header: 'Rate',
    cell: ({ row }) => (
      <span className="font-mono">{row.original.feeType === 'aum_based' ? `${(row.original.rate * 100).toFixed(2)}%` : <CurrencyValue value={row.original.rate} className="font-mono" />}</span>
    ),
    size: 80,
  },
  {
    accessorKey: 'annualRevenue', header: 'Annual Revenue',
    cell: ({ row }) => <CurrencyValue value={row.original.annualRevenue} compact className="font-mono font-medium" />,
    size: 120,
  },
]

const segmentColumns: ColumnDef<RevenueBySegment, unknown>[] = [
  {
    accessorKey: 'segment', header: 'Segment',
    cell: ({ row }) => <Badge variant={TIER_VARIANTS[row.original.segment] ?? 'default'}>{row.original.segment}</Badge>,
    size: 120,
  },
  {
    accessorKey: 'revenue', header: 'Revenue',
    cell: ({ row }) => <CurrencyValue value={row.original.revenue} compact className="font-mono font-medium" />,
    size: 120,
  },
  {
    accessorKey: 'clientCount', header: 'Households',
    cell: ({ row }) => <span className="font-mono">{row.original.clientCount}</span>,
    size: 100,
  },
]

function RevenueContent() {
  const { formatWithConversion } = useFormatCurrency()
  const { data: metrics, isLoading } = useRevenueMetrics()
  const { data: fees } = useFeeSchedules()
  const { data: trend } = useRevenueTrend()
  const { data: bySegment } = useRevenueBySegment()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {metrics && (
        <div data-annotation="revenue-metrics">
          <DenseMetricsBar metrics={[
            { label: 'Total Recurring Revenue', value: formatWithConversion(metrics.totalRecurringRevenue, 'USD', { compact: true }) },
            { label: 'MTD Revenue', value: formatWithConversion(metrics.mtdRevenue, 'USD', { compact: true }) },
            { label: 'YTD Revenue', value: formatWithConversion(metrics.ytdRevenue, 'USD', { compact: true }) },
            {
              label: 'Revenue Growth (YoY)',
              value: formatPercent(metrics.revenueGrowthYoY),
              change: {
                value: formatPercent(metrics.revenueGrowthYoY),
                direction: metrics.revenueGrowthYoY >= 0 ? 'up' : 'down',
              },
            },
          ] satisfies DenseMetric[]} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue trend chart */}
        <div className="xl:col-span-2" data-annotation="revenue-trend">
          <Card>
            <CardHeader>Revenue Trend (Monthly)</CardHeader>
            <CardContent>
              {trend && (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                    <RechartsTooltip formatter={(value: number) => formatWithConversion(value, 'USD')} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--accent-blue)" strokeWidth={2} dot={false} name="Revenue" />
                    <Line type="monotone" dataKey="projected" stroke="var(--accent-purple)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Projected" />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue by segment */}
        <div data-annotation="revenue-segment">
          <Card>
            <CardHeader>By Segment</CardHeader>
            <CardContent>
              {bySegment && (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bySegment}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                      <XAxis dataKey="segment" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                      <RechartsTooltip formatter={(value: number) => formatWithConversion(value, 'USD')} />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {bySegment.map((entry) => (
                          <Cell key={entry.segment} fill={SEGMENT_COLORS[entry.segment] ?? '#94A3B8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <DataTable data={bySegment} columns={segmentColumns} compact />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fee schedule table */}
      <Card>
        <CardHeader action={
          <span className="text-caption text-text-secondary">{fees?.length ?? 0} households</span>
        }>
          Fee Schedules
        </CardHeader>
        <DataTable data={fees ?? []} columns={feeColumns} compact />
      </Card>
    </div>
  )
}

export function RevenuePage() {
  const tabs = [
    { id: 'revenue', label: 'Revenue', content: <RevenueContent /> },
    { id: 'team', label: 'Team Activity', content: <TeamActivityView /> },
    { id: 'book', label: 'Book Analytics', content: <BookAnalyticsView /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Practice Management</h1>
      <TabLayout tabs={tabs} defaultTab="revenue" />
    </div>
  )
}
