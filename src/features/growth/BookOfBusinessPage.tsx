import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBookOfBusiness } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { DenseMetric } from '@/components/ui/DenseMetricsBar'
import type { BookSegment, CapacityMetrics, AUMWaterfallItem } from '@/services/pms'

const SEGMENT_COLORS: Record<string, string> = {
  platinum: '#7C3AED',
  gold: '#D97706',
  silver: '#94A3B8',
  bronze: '#2563EB',
  unclassified: '#CBD5E1',
}

const SEGMENT_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'unclassified']

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; value: number; displayValue: number } }> }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  const isPositive = d.value >= 0
  return (
    <div className="rounded-md border border-border-primary bg-white px-3 py-2 shadow-lg">
      <div className="text-caption font-medium text-text-primary">{d.label}</div>
      <div className={`font-mono text-caption font-medium ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
        {isPositive ? '+' : ''}{formatCurrency(d.value, true)}
      </div>
    </div>
  )
}

function AUMWaterfall({ data }: { data: AUMWaterfallItem[] }) {
  // Build cumulative waterfall bars for Recharts stacked bar
  type WaterfallBar = { label: string; value: number; start: number; end: number; displayValue: number }
  const bars: WaterfallBar[] = []
  let running = 0
  for (const d of data) {
    bars.push({ label: d.label, value: d.value, start: running, end: running + d.value, displayValue: d.value })
    running += d.value
  }
  bars.push({ label: 'Current AUM', value: running, start: 0, end: running, displayValue: running })

  // For Recharts stacked bar: invisible base + visible bar
  const chartData = bars.map((b) => ({
    label: b.label,
    base: Math.min(b.start, b.end),
    bar: Math.abs(b.end - b.start),
    value: b.value,
    displayValue: b.displayValue,
    isTotal: b.label === 'Current AUM',
    isNegative: b.value < 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickFormatter={(v: number) => formatCurrency(v, true)}
          width={60}
        />
        <RechartsTooltip content={<WaterfallTooltip />} />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="bar" stackId="a" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isTotal ? 'var(--accent-blue)' : entry.isNegative ? 'var(--accent-red)' : 'var(--accent-green)'}
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function SegmentTable({ segments }: { segments: BookSegment[] }) {
  const sorted = [...segments].sort((a, b) => {
    const ai = SEGMENT_ORDER.indexOf(a.segment)
    const bi = SEGMENT_ORDER.indexOf(b.segment)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="overflow-hidden rounded-md border border-border-primary">
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border-primary bg-surface-secondary">
            <th className="px-3 py-2 font-medium text-text-secondary">Segment</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Households</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">AUM</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">% of AUM</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((seg) => (
            <tr key={seg.segment} className="border-b border-border-primary last:border-0">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: SEGMENT_COLORS[seg.segment] ?? '#CBD5E1' }}
                  />
                  <span className="font-medium capitalize text-text-primary">{seg.segment}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{seg.householdCount}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{formatCurrency(seg.aum, true)}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{formatPercent(seg.pctOfAUM * 100, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CapacityCard({ capacity }: { capacity: CapacityMetrics }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-caption">
          <span className="text-text-secondary">Client Utilization</span>
          <span className="font-mono font-medium text-text-primary">
            {capacity.currentClients} / {capacity.targetClients}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-accent-blue transition-all"
            style={{ width: `${Math.min(capacity.utilizationPct, 100)}%` }}
          />
        </div>
        <div className="text-right font-mono text-[11px] text-text-tertiary">{capacity.utilizationPct}%</div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-caption">
          <span className="text-text-secondary">Meeting Capacity</span>
          <span className="font-mono font-medium text-text-primary">
            {capacity.meetingsPerWeek}/wk
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-accent-purple transition-all"
            style={{ width: `${Math.min(capacity.meetingCapacityPct, 100)}%` }}
          />
        </div>
        <div className="text-right font-mono text-[11px] text-text-tertiary">{capacity.meetingCapacityPct}%</div>
      </div>
      <div className="rounded-md bg-surface-secondary px-3 py-2">
        <div className="text-caption text-text-tertiary">Avg meetings per client</div>
        <div className="font-mono text-body-strong text-text-primary">{capacity.avgMeetingsPerClient}/yr</div>
      </div>
    </div>
  )
}

export function BookOfBusinessPage() {
  const { data, isLoading } = useBookOfBusiness()

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[52px]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const metrics: DenseMetric[] = [
    { label: 'Total AUM', value: formatCurrency(data.totalAUM, true), change: { value: `${data.organicGrowthRate}%`, direction: 'up' } },
    { label: 'Households', value: String(data.householdCount) },
    { label: 'Clients', value: String(data.clientCount) },
    { label: 'Annual Revenue', value: formatCurrency(data.annualRevenue, true), change: { value: '4.2%', direction: 'up' } },
    { label: 'Effective Fee', value: `${data.effectiveFee} bps` },
    { label: 'Organic Growth', value: `${data.organicGrowthRate}%`, change: { value: '0.3%', direction: 'up' } },
    { label: 'Retention', value: `${data.retentionRate}%` },
    { label: 'HHI', value: String(data.revenueConcentrationHHI) },
  ]

  return (
    <div className="space-y-4">
      <DenseMetricsBar metrics={metrics} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* AUM Waterfall */}
        <Card>
          <CardHeader>AUM Decomposition (Trailing 12M)</CardHeader>
          <CardContent>
            <AUMWaterfall data={data.aumWaterfall} />
          </CardContent>
        </Card>

        {/* Client Segmentation */}
        <Card>
          <CardHeader>Client Segmentation</CardHeader>
          <CardContent>
            <SegmentTable segments={data.segments} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Capacity Analysis */}
        <Card>
          <CardHeader>Capacity Analysis</CardHeader>
          <CardContent>
            <CapacityCard capacity={data.capacity} />
          </CardContent>
        </Card>

        {/* Revenue Concentration */}
        <Card>
          <CardHeader>Revenue Concentration</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-surface-secondary px-4 py-3 text-center">
                  <div className="font-mono text-heading text-text-primary">{data.revenueConcentrationHHI}</div>
                  <div className="text-caption text-text-tertiary">HHI Score</div>
                </div>
                <div className="text-caption text-text-secondary">
                  {data.revenueConcentrationHHI < 1500
                    ? 'Well-diversified practice. Low concentration risk.'
                    : data.revenueConcentrationHHI < 2500
                      ? 'Moderate concentration. Monitor top clients.'
                      : 'High concentration. Revenue at risk from attrition.'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary">Attrition (TTM)</span>
                  <span className="font-mono font-medium text-text-primary">{data.attritionCount} household{data.attritionCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary">Retention Rate</span>
                  <span className="font-mono font-medium text-accent-green">{data.retentionRate}%</span>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary">Organic Growth Rate</span>
                  <span className="font-mono font-medium text-accent-green">+{data.organicGrowthRate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
