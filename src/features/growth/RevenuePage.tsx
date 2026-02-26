import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabLayout } from '@/components/ui/TabLayout'
import { useRevenueMetrics, useFeeSchedules, useRevenueTrend, useRevenueBySegment } from '@/hooks/use-revenue'
import { formatCurrency, formatPercent } from '@/lib/utils'
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
      <span className="font-mono">{row.original.feeType === 'aum_based' ? `${(row.original.rate * 100).toFixed(2)}%` : formatCurrency(row.original.rate)}</span>
    ),
    size: 80,
  },
  {
    accessorKey: 'annualRevenue', header: 'Annual Revenue',
    cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.annualRevenue, true)}</span>,
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
    cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.revenue, true)}</span>,
    size: 120,
  },
  {
    accessorKey: 'clientCount', header: 'Households',
    cell: ({ row }) => <span className="font-mono">{row.original.clientCount}</span>,
    size: 100,
  },
]

function RevenueContent() {
  const { data: metrics, isLoading } = useRevenueMetrics()
  const { data: fees } = useFeeSchedules()
  const { data: trend } = useRevenueTrend()
  const { data: bySegment } = useRevenueBySegment()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {metrics && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Total Recurring Revenue" value={formatCurrency(metrics.totalRecurringRevenue, true)} />
          <MetricCard label="MTD Revenue" value={formatCurrency(metrics.mtdRevenue, true)} />
          <MetricCard label="YTD Revenue" value={formatCurrency(metrics.ytdRevenue, true)} />
          <MetricCard
            label="Revenue Growth (YoY)"
            value={formatPercent(metrics.revenueGrowthYoY)}
            change={{
              value: formatPercent(metrics.revenueGrowthYoY),
              direction: metrics.revenueGrowthYoY >= 0 ? 'up' : 'down',
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue trend chart */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>Revenue Trend (Monthly)</CardHeader>
            <CardContent>
              {trend && (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
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
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
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
