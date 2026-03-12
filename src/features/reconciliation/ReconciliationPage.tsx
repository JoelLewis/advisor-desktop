import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts'
import {
  CheckCircle2, AlertTriangle, XCircle, Clock,
  Activity, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { TabLayout } from '@/components/ui/TabLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import {
  useIntegrationHealth, useReconBreaks, useDataQualitySummary,
  useReconTrending, useResolveBreak,
} from '@/hooks/use-reconciliation'
import type { ReconStatus, BreakSeverity } from '@/types/reconciliation'

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const STATUS_ICONS: Record<ReconStatus, { icon: typeof CheckCircle2; color: string }> = {
  synced: { icon: CheckCircle2, color: 'text-accent-green' },
  pending: { icon: Clock, color: 'text-amber-500' },
  break: { icon: XCircle, color: 'text-accent-red' },
  error: { icon: XCircle, color: 'text-accent-red' },
}

const SEVERITY_COLORS: Record<BreakSeverity, string> = {
  critical: 'border-accent-red/30 bg-accent-red/5',
  high: 'border-accent-red/20 bg-accent-red/5',
  medium: 'border-amber-200 bg-amber-50',
  low: 'border-border-primary bg-surface-secondary',
}

const SEVERITY_BADGE: Record<BreakSeverity, 'red' | 'yellow' | 'default'> = {
  critical: 'red',
  high: 'red',
  medium: 'yellow',
  low: 'default',
}

function SummaryCards() {
  const { data: summary } = useDataQualitySummary()
  if (!summary) return <Skeleton className="h-20" />

  const cards = [
    { label: 'Position Match', value: `${summary.positionMatchRate.toFixed(1)}%`, color: summary.positionMatchRate >= 99.5 ? 'text-accent-green' : 'text-amber-600' },
    { label: 'Cash Match', value: `${summary.cashMatchRate.toFixed(1)}%`, color: summary.cashMatchRate >= 99.5 ? 'text-accent-green' : 'text-amber-600' },
    { label: 'Transaction Match', value: `${summary.transactionMatchRate.toFixed(1)}%`, color: summary.transactionMatchRate >= 99.5 ? 'text-accent-green' : 'text-amber-600' },
    { label: 'Open Breaks', value: String(summary.openBreaks), color: summary.openBreaks > 0 ? 'text-accent-red' : 'text-accent-green' },
    { label: 'Resolved Today', value: String(summary.resolvedToday), color: 'text-accent-green' },
    { label: 'Avg Resolution', value: `${summary.avgResolutionMinutes}m`, color: 'text-text-primary' },
  ]

  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-3 text-center">
            <div className="text-caption text-text-tertiary">{c.label}</div>
            <div className={cn('font-mono text-heading', c.color)}>{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TrendingCharts() {
  const { data: trending } = useReconTrending()
  if (!trending) return <Skeleton className="h-64" />

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>Match Rate Trend (30 days)</CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trending} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis domain={[97, 100]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `${v}%`} width={45} />
              <RechartsTooltip contentStyle={{ fontSize: 11, border: '1px solid var(--border-primary)', background: 'var(--surface-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="positionMatchRate" name="Positions" stroke="var(--accent-blue)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cashMatchRate" name="Cash" stroke="var(--accent-green)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="transactionMatchRate" name="Transactions" stroke="var(--accent-purple)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Open Breaks (30 days)</CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trending} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} width={30} allowDecimals={false} />
              <RechartsTooltip contentStyle={{ fontSize: 11, border: '1px solid var(--border-primary)', background: 'var(--surface-primary)' }} />
              <Bar dataKey="openBreaks" name="Open Breaks" fill="var(--accent-red)" opacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function BreakResolutionPanel() {
  const { data: openBreaks } = useReconBreaks({ resolved: 'false' })
  const { data: resolvedBreaks } = useReconBreaks({ resolved: 'true' })
  const [showResolved, setShowResolved] = useState(false)
  const resolve = useResolveBreak()

  return (
    <div className="space-y-4">
      {/* Open Breaks */}
      <div>
        <h3 className="mb-2 text-body-strong text-text-primary">
          Open Breaks {openBreaks && <span className="text-text-tertiary">({openBreaks.length})</span>}
        </h3>
        {!openBreaks || openBreaks.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-md border border-border-primary text-caption text-text-tertiary">
            <CheckCircle2 className="mr-2 h-4 w-4 text-accent-green" />
            All breaks resolved
          </div>
        ) : (
          <div className="space-y-2">
            {openBreaks.map((brk) => (
              <div key={brk.id} className={cn('rounded-md border px-4 py-3', SEVERITY_COLORS[brk.severity])}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-caption font-medium text-text-primary">{brk.integrationName}</span>
                    <Badge variant={SEVERITY_BADGE[brk.severity]}>{brk.severity}</Badge>
                  </div>
                  <button
                    onClick={() => resolve.mutate(brk.id)}
                    disabled={resolve.isPending}
                    className="rounded-md bg-accent-green/10 px-2.5 py-1 text-caption font-medium text-accent-green hover:bg-accent-green/20 disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-caption">
                  {brk.accountName && (
                    <div>
                      <span className="text-text-tertiary">Account: </span>
                      <span className="font-medium text-text-primary">{brk.accountName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-tertiary">Field: </span>
                    <span className="font-medium text-text-primary">{brk.field}</span>
                  </div>
                </div>
                <div className="mt-1 flex gap-6 font-mono text-[11px] text-text-secondary">
                  <span>Expected: <span className="font-medium">{brk.expectedValue}</span></span>
                  <span>Actual: <span className="font-medium">{brk.actualValue}</span></span>
                </div>
                <div className="mt-1 text-[10px] text-text-tertiary">Detected {formatTimeAgo(brk.detectedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Breaks */}
      {resolvedBreaks && resolvedBreaks.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="mb-2 flex items-center gap-1 text-caption font-medium text-text-secondary hover:text-text-primary"
          >
            {showResolved ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Resolved ({resolvedBreaks.length})
          </button>
          {showResolved && (
            <div className="space-y-2">
              {resolvedBreaks.map((brk) => (
                <div key={brk.id} className="rounded-md border border-border-primary bg-surface-secondary px-4 py-2 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" />
                      <span className="text-caption text-text-secondary">{brk.integrationName} — {brk.field}</span>
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      resolved {brk.resolvedAt ? formatTimeAgo(brk.resolvedAt) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IntegrationHealthTable() {
  const { data: integrations } = useIntegrationHealth()
  if (!integrations) return <Skeleton className="h-48" />

  return (
    <div className="overflow-hidden rounded-md border border-border-primary">
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border-primary bg-surface-secondary">
            <th className="px-3 py-2 font-medium text-text-secondary">Integration</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Status</th>
            <th className="px-3 py-2 font-medium text-text-secondary">Last Sync</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Breaks</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Uptime (30d)</th>
          </tr>
        </thead>
        <tbody>
          {integrations.map((ig) => {
            const cfg = STATUS_ICONS[ig.status]
            const Icon = cfg.icon
            return (
              <tr key={ig.name} className="border-b border-border-primary last:border-0 hover:bg-surface-tertiary/50">
                <td className="px-3 py-2 font-medium text-text-primary">{ig.name}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                    <span className="capitalize text-text-secondary">{ig.status}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-text-secondary">{formatTimeAgo(ig.lastSync)}</td>
                <td className="px-3 py-2 text-right">
                  {ig.breakCount > 0 ? (
                    <Badge variant="red">{ig.breakCount}</Badge>
                  ) : (
                    <span className="text-text-tertiary">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={cn('font-mono', ig.uptime >= 99.5 ? 'text-accent-green' : ig.uptime >= 99 ? 'text-amber-600' : 'text-accent-red')}>
                    {ig.uptime.toFixed(1)}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ReconciliationPage() {
  const { isLoading } = useDataQualitySummary()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const tabs = [
    {
      id: 'breaks',
      label: 'Break Resolution',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      content: <BreakResolutionPanel />,
    },
    {
      id: 'health',
      label: 'Integration Health',
      icon: <Activity className="h-3.5 w-3.5" />,
      content: <IntegrationHealthTable />,
    },
  ]

  return (
    <div className="space-y-4">
      <SummaryCards />
      <TrendingCharts />
      <Card>
        <TabLayout tabs={tabs} />
      </Card>
    </div>
  )
}
