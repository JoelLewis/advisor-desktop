import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DenseMetricsBar } from '@/components/ui/DenseMetricsBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBookOfBusiness } from '@/hooks/use-portfolio'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import type { DenseMetric } from '@/components/ui/DenseMetricsBar'
import type { BookSegment, CapacityMetrics, AUMWaterfallItem } from '@/services/pms'

const SEGMENT_COLORS: Record<string, string> = {
  platinum: '#8B7EC8',
  gold: '#D97706',
  silver: '#94A3B8',
  bronze: '#2563EB',
  unclassified: '#CBD5E1',
}

const SEGMENT_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'unclassified']

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; value: number } }> }) {
  const { formatWithConversion } = useFormatCurrency()
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  const isPositive = d.value >= 0
  return (
    <div className="rounded-md border border-border-primary bg-surface-primary px-3 py-2 shadow-lg">
      <div className="text-caption font-medium text-text-primary">{d.label}</div>
      <div className={`font-mono text-caption font-medium ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
        {isPositive ? '+' : ''}{formatWithConversion(d.value, 'USD', { compact: true })}
      </div>
    </div>
  )
}

function AUMWaterfall({ data, domain }: { data: AUMWaterfallItem[]; domain: [number, number] }) {
  const { formatWithConversion } = useFormatCurrency()

  type Bar = { label: string; base: number; bar: number; value: number; isTotal: boolean; isNegative: boolean }
  const bars: Bar[] = []
  let running = 0
  for (const d of data) {
    if (d.kind === 'anchor') {
      running = d.value
      bars.push({ label: d.label, base: domain[0], bar: d.value - domain[0], value: d.value, isTotal: true, isNegative: false })
    } else {
      const start = running
      running += d.value
      bars.push({
        label: d.label,
        base: Math.min(start, running),
        bar: Math.abs(d.value),
        value: d.value,
        isTotal: false,
        isNegative: d.value < 0,
      })
    }
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={bars} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} angle={-20} textAnchor="end" height={50} />
        <YAxis
          domain={domain}
          allowDataOverflow
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickFormatter={(v: number) => formatWithConversion(v, 'USD', { compact: true })}
          width={60}
        />
        <RechartsTooltip content={<WaterfallTooltip />} />
        <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="bar" stackId="a" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {bars.map((entry, i) => (
            <Cell key={i} fill={entry.isTotal ? 'var(--accent-blue)' : entry.isNegative ? 'var(--accent-red)' : 'var(--accent-green)'} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function SegmentTable({ segments }: { segments: BookSegment[] }) {
  const { formatWithConversion } = useFormatCurrency()
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
                    className="h-2.5 w-2.5 rounded-xs"
                    style={{ backgroundColor: SEGMENT_COLORS[seg.segment] ?? '#CBD5E1' }}
                  />
                  <span className="font-medium capitalize text-text-primary">{seg.segment}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{seg.householdCount}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{formatWithConversion(seg.aum, 'USD', { compact: true })}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">{(seg.pctOfAUM * 100).toFixed(1)}%</td>
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
  const { formatWithConversion } = useFormatCurrency()

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
    { label: 'Total AUM', value: formatWithConversion(data.totalAUM, 'USD', { compact: true }), change: { value: `${data.organicGrowthRate}%`, direction: 'up' } },
    { label: 'Households', value: String(data.householdCount) },
    { label: 'Clients', value: String(data.clientCount) },
    { label: 'Annual revenue', value: formatWithConversion(data.annualRevenue, 'USD', { compact: true }) },
    { label: 'Effective fee', value: `${data.effectiveFeeBps} bps` },
    { label: 'Organic growth', value: `${data.organicGrowthRate}%` },
    { label: 'Retention', value: `${data.retentionRate}%` },
    { label: 'AUM concentration', value: String(data.concentrationHHI) },
  ]

  return (
    <div className="space-y-4">
      <DenseMetricsBar metrics={metrics} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* AUM Waterfall */}
        <Card>
          <CardHeader>AUM decomposition (trailing 12 months)</CardHeader>
          <CardContent>
            <AUMWaterfall data={data.aumWaterfall} domain={data.aumWaterfallDomain} />
            <p className="mt-2 text-caption text-text-tertiary">
              Vertical axis begins at {formatWithConversion(data.aumWaterfallDomain[0], 'USD', { compact: true })}, not zero, so
              that period movements are legible against the opening balance.
            </p>
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

        {/* AUM Concentration */}
        <Card>
          <CardHeader>AUM concentration</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-surface-secondary px-4 py-3 text-center">
                  <div className="font-mono text-heading text-text-primary">{data.concentrationHHI}</div>
                  <div className="text-caption text-text-tertiary">HHI Score</div>
                </div>
                <div className="text-caption text-text-secondary">
                  {data.concentrationHHI < 1500
                    ? 'Well-diversified practice. Low concentration risk.'
                    : data.concentrationHHI < 2500
                      ? 'Moderate concentration. Monitor top clients.'
                      : 'High concentration. Revenue at risk from attrition.'}
                </div>
              </div>
              <div className="text-caption text-text-secondary">
                Effective number of households: <span className="font-mono">{data.concentrationEffectiveN}</span>.
                At {data.householdCount} households the mathematical floor is{' '}
                <span className="font-mono">{Math.round(10_000 / data.householdCount)}</span>.
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
