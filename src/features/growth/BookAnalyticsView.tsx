import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBookAnalytics } from '@/hooks/use-practice'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'

const SEGMENT_COLORS: Record<string, string> = {
  platinum: '#7C3AED',
  gold: '#D97706',
  silver: '#94A3B8',
  bronze: '#2563EB',
}

type SegmentRow = { segment: string; aum: number; count: number }
type GrowthRow = { householdId: string; name: string; aumGrowth: number; growthPct: number }

const segmentColumns: ColumnDef<SegmentRow, unknown>[] = [
  {
    accessorKey: 'segment',
    header: 'Segment',
    cell: ({ row }) => (
      <span className="font-medium capitalize">{row.original.segment}</span>
    ),
    size: 120,
  },
  {
    accessorKey: 'aum',
    header: 'AUM',
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.original.aum, true)}</span>
    ),
    size: 120,
  },
  {
    accessorKey: 'count',
    header: 'Households',
    cell: ({ row }) => <span className="font-mono">{row.original.count}</span>,
    size: 100,
  },
]

const growthColumns: ColumnDef<GrowthRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Household',
    cell: ({ row }) => (
      <Link
        to={`/households/${row.original.householdId}`}
        className="text-accent-blue hover:underline font-medium"
      >
        {row.original.name}
      </Link>
    ),
    size: 180,
  },
  {
    accessorKey: 'aumGrowth',
    header: 'AUM Growth',
    cell: ({ row }) => (
      <span className="font-mono text-accent-green">{formatCurrency(row.original.aumGrowth, true)}</span>
    ),
    size: 120,
  },
  {
    accessorKey: 'growthPct',
    header: 'Growth %',
    cell: ({ row }) => (
      <span className="font-mono text-accent-green">{formatPercent(row.original.growthPct)}</span>
    ),
    size: 100,
  },
]

export function BookAnalyticsView() {
  const { data: analytics, isLoading } = useBookAnalytics()

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AUM by Segment */}
      <Card data-annotation="book-segments">
        <CardHeader>AUM by Segment</CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.aumBySegment} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="segment"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(0)}M`}
              />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value, true)} />
              <Bar dataKey="aum" radius={[4, 4, 0, 0]} name="AUM">
                {analytics.aumBySegment.map((entry) => (
                  <Cell key={entry.segment} fill={SEGMENT_COLORS[entry.segment] ?? '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <DataTable data={analytics.aumBySegment} columns={segmentColumns} compact />
          </div>
        </CardContent>
      </Card>

      {/* Client Tenure Distribution */}
      <Card>
        <CardHeader>Client Tenure Distribution</CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.clientTenure}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                allowDecimals={false}
              />
              <RechartsTooltip />
              <Bar dataKey="count" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} name="Clients" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Trend */}
      <Card data-annotation="book-growth">
        <CardHeader>Client Growth Trend (12 Months)</CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.growthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} allowDecimals={false} />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="newClients" stroke="var(--accent-green)" strokeWidth={2} name="New Clients" />
              <Line type="monotone" dataKey="attrition" stroke="var(--accent-red)" strokeWidth={2} name="Attrition" />
              <Line type="monotone" dataKey="netNew" stroke="var(--accent-blue)" strokeWidth={2} name="Net New" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Growth Households */}
      <Card>
        <CardHeader>Top Growth Households</CardHeader>
        <DataTable data={analytics.topGrowthHouseholds} columns={growthColumns} compact />
      </Card>
    </div>
  )
}
