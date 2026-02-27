import { useState } from 'react'
import {
  CheckCircle2, AlertTriangle, XCircle, Clock,
  ChevronDown, ChevronUp, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntegrationHealth, useReconBreaks, useDataQualitySummary } from '@/hooks/use-reconciliation'
import type { IntegrationHealth, ReconBreak, ReconStatus, BreakSeverity } from '@/types/reconciliation'

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

const STATUS_CONFIG: Record<ReconStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  synced: { icon: CheckCircle2, color: 'text-accent-green', label: 'Synced' },
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  break: { icon: XCircle, color: 'text-accent-red', label: 'Break' },
  error: { icon: XCircle, color: 'text-accent-red', label: 'Error' },
}

const SEVERITY_COLORS: Record<BreakSeverity, string> = {
  critical: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  high: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-surface-tertiary text-text-secondary border-border-primary',
}

function MatchRateBar({ label, rate }: { label: string; rate: number }) {
  const color = rate >= 99.5 ? 'bg-accent-green' : rate >= 99 ? 'bg-amber-500' : 'bg-accent-red'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-caption">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono font-medium text-text-primary">{rate.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-tertiary">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

function IntegrationRow({ integration }: { integration: IntegrationHealth }) {
  const cfg = STATUS_CONFIG[integration.status]
  const Icon = cfg.icon
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
        <span className="text-caption text-text-primary">{integration.name}</span>
      </div>
      <div className="flex items-center gap-3">
        {integration.breakCount > 0 && (
          <span className="rounded bg-accent-red/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-red">
            {integration.breakCount} break{integration.breakCount > 1 ? 's' : ''}
          </span>
        )}
        <span className="font-mono text-[11px] text-text-tertiary">{formatTimeAgo(integration.lastSync)}</span>
      </div>
    </div>
  )
}

function BreakRow({ brk }: { brk: ReconBreak }) {
  return (
    <div className={cn('rounded-md border px-3 py-2', SEVERITY_COLORS[brk.severity])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-caption font-medium">{brk.integrationName}</span>
        </div>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">{brk.severity}</span>
      </div>
      <div className="mt-1 flex gap-4 text-[11px]">
        {brk.accountName && (
          <span>Account: <span className="font-medium">{brk.accountName}</span></span>
        )}
        <span>Field: <span className="font-medium">{brk.field}</span></span>
      </div>
      <div className="mt-1 flex gap-4 font-mono text-[11px]">
        <span>Expected: <span className="font-medium">{brk.expectedValue}</span></span>
        <span>Actual: <span className="font-medium">{brk.actualValue}</span></span>
      </div>
      <div className="mt-1 text-[10px] opacity-70">
        Detected {formatTimeAgo(brk.detectedAt)}
      </div>
    </div>
  )
}

type DataQualityPanelProps = {
  open: boolean
  onClose: () => void
}

export function DataQualityPanel({ open, onClose }: DataQualityPanelProps) {
  const [showResolved, setShowResolved] = useState(false)
  const { data: integrations } = useIntegrationHealth()
  const { data: openBreaks } = useReconBreaks({ resolved: 'false' })
  const { data: resolvedBreaks } = useReconBreaks({ resolved: 'true' })
  const { data: summary } = useDataQualitySummary()

  if (!open) return null

  const syncedCount = integrations?.filter((i) => i.status === 'synced').length ?? 0
  const totalCount = integrations?.length ?? 0

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed bottom-statusbar left-0 right-0 z-50 mx-auto max-h-[60vh] w-full max-w-2xl overflow-hidden rounded-t-lg border border-b-0 border-border-primary bg-surface-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-blue" />
            <h3 className="text-body-strong text-text-primary">Data Quality</h3>
            <span className="rounded-full bg-accent-green/10 px-2 py-0.5 text-[10px] font-medium text-accent-green">
              {syncedCount}/{totalCount} synced
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 scrollbar-thin" style={{ maxHeight: 'calc(60vh - 52px)' }}>
          {/* Match Rates */}
          {summary && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              <MatchRateBar label="Positions" rate={summary.positionMatchRate} />
              <MatchRateBar label="Cash" rate={summary.cashMatchRate} />
              <MatchRateBar label="Transactions" rate={summary.transactionMatchRate} />
            </div>
          )}

          {/* Summary Stats */}
          {summary && (
            <div className="mb-4 flex gap-4 rounded-md bg-surface-secondary px-3 py-2">
              <div className="text-caption">
                <span className="text-text-tertiary">Open breaks </span>
                <span className="font-mono font-medium text-text-primary">{summary.openBreaks}</span>
              </div>
              <div className="text-caption">
                <span className="text-text-tertiary">Resolved today </span>
                <span className="font-mono font-medium text-accent-green">{summary.resolvedToday}</span>
              </div>
              <div className="text-caption">
                <span className="text-text-tertiary">Avg resolution </span>
                <span className="font-mono font-medium text-text-primary">{summary.avgResolutionMinutes}m</span>
              </div>
            </div>
          )}

          {/* Open Breaks */}
          {openBreaks && openBreaks.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-caption font-medium text-text-secondary">Open Breaks</h4>
              <div className="space-y-2">
                {openBreaks.map((brk) => (
                  <BreakRow key={brk.id} brk={brk} />
                ))}
              </div>
            </div>
          )}

          {/* Resolved Breaks (collapsed by default) */}
          {resolvedBreaks && resolvedBreaks.length > 0 && (
            <div className="mb-4">
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
                    <div key={brk.id} className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2 opacity-60">
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

          {/* Integration Health */}
          <div>
            <h4 className="mb-2 text-caption font-medium text-text-secondary">Integration Health</h4>
            <div className="rounded-md border border-border-primary">
              <div className="divide-y divide-border-primary px-3">
                {integrations?.map((integration) => (
                  <IntegrationRow key={integration.name} integration={integration} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
