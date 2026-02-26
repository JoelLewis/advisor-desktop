import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Users, Calendar, Shield,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useModelGovernance } from '@/hooks/use-portfolio'
import { formatCurrency, cn } from '@/lib/utils'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import type { ModelGovernanceDetail, ModelVersion } from '@/types/portfolio'

const RISK_PROFILE_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  moderate_conservative: 'Moderate Conservative',
  moderate: 'Moderate',
  moderate_aggressive: 'Moderate Aggressive',
  aggressive: 'Aggressive',
}

const RISK_PROFILE_VARIANTS: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  conservative: 'blue',
  moderate_conservative: 'blue',
  moderate: 'green',
  moderate_aggressive: 'yellow',
  aggressive: 'red',
}

const REBALANCE_FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  threshold_only: 'Threshold Only',
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  us_equity: 'bg-blue-500',
  intl_equity: 'bg-indigo-500',
  emerging_markets: 'bg-violet-500',
  fixed_income: 'bg-emerald-500',
  alternatives: 'bg-amber-500',
  real_estate: 'bg-orange-500',
  commodities: 'bg-yellow-500',
  cash: 'bg-gray-400',
  digital_assets: 'bg-purple-500',
  private_equity: 'bg-purple-500',
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  weight_change: 'bg-accent-blue',
  security_add: 'bg-accent-green',
  security_remove: 'bg-accent-red',
}

const VERSION_STATUS_FALLBACK = { label: 'Draft', icon: AlertCircle, className: 'text-text-tertiary' } as const

const VERSION_STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  approved: { label: 'Approved', icon: CheckCircle2, className: 'text-accent-green' },
  pending_approval: { label: 'Pending Approval', icon: Clock, className: 'text-amber-500' },
  draft: VERSION_STATUS_FALLBACK,
  rejected: { label: 'Rejected', icon: AlertCircle, className: 'text-accent-red' },
}

function VersionTimeline({ versions }: { versions: ModelVersion[] }) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {versions.map((v) => {
        const statusConfig = VERSION_STATUS_CONFIG[v.status] ?? VERSION_STATUS_FALLBACK
        const StatusIcon = statusConfig.icon
        const isExpanded = expandedVersion === v.version

        return (
          <div key={v.version} className="rounded-lg border border-border-primary">
            <button
              onClick={() => setExpandedVersion(isExpanded ? null : v.version)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-tertiary"
            >
              <div className="flex items-center gap-3">
                <StatusIcon className={cn('h-4 w-4', statusConfig?.className)} />
                <span className="font-mono text-body font-medium">v{v.version}</span>
                <Badge variant={v.status === 'pending_approval' ? 'yellow' : v.status === 'approved' ? 'green' : 'default'}>
                  {statusConfig?.label ?? v.status}
                </Badge>
                <span className="text-caption text-text-secondary">{v.effectiveDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-caption text-text-tertiary">by {v.author}</span>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 text-text-tertiary" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border-primary px-4 py-3 space-y-3">
                {/* Changes */}
                <div>
                  <h4 className="text-caption font-medium text-text-secondary mb-2">Changes</h4>
                  <div className="space-y-1.5">
                    {v.changes.map((change) => (
                      <div key={change.id} className="flex items-center gap-2 text-caption">
                        <span className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          CHANGE_TYPE_COLORS[change.type] ?? 'bg-text-tertiary',
                        )} />
                        <span className="text-text-primary">{change.description}</span>
                        {change.oldValue !== undefined && change.newValue !== undefined && (
                          <span className="text-text-tertiary">
                            ({typeof change.oldValue === 'number' ? `${(change.oldValue * 100).toFixed(0)}%` : change.oldValue}
                            {' → '}
                            {typeof change.newValue === 'number' ? `${(change.newValue * 100).toFixed(0)}%` : change.newValue})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allocation snapshot */}
                <div>
                  <h4 className="text-caption font-medium text-text-secondary mb-2">Allocation Snapshot</h4>
                  <div className="flex gap-1 h-6 rounded overflow-hidden">
                    {v.assetClasses.map((ac) => (
                      <div
                        key={ac.assetClass}
                        className={cn('relative group', ASSET_CLASS_COLORS[ac.assetClass] ?? 'bg-purple-500')}
                        style={{ width: `${ac.targetWeight * 100}%` }}
                        title={`${ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass}: ${(ac.targetWeight * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {v.assetClasses.map((ac) => (
                      <span key={ac.assetClass} className="text-[10px] text-text-tertiary">
                        {ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass} {(ac.targetWeight * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* Approval info */}
                {v.approvedBy && (
                  <div className="text-caption text-text-tertiary">
                    Approved by <span className="text-text-secondary">{v.approvedBy}</span> on {v.approvedDate}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ModelCard({ model }: { model: ModelGovernanceDetail }) {
  const [expanded, setExpanded] = useState(false)
  const hasPending = model.versions.some((v) => v.status === 'pending_approval')

  return (
    <Card className={cn(hasPending && 'border-amber-300')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold text-text-primary">{model.name}</h3>
              <Badge variant={RISK_PROFILE_VARIANTS[model.riskProfile] ?? 'blue'}>
                {RISK_PROFILE_LABELS[model.riskProfile] ?? model.riskProfile}
              </Badge>
              {hasPending && (
                <Badge variant="yellow">Pending Change</Badge>
              )}
            </div>
            <p className="text-caption text-text-secondary mt-0.5">
              {model.description} — {model.benchmark}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-caption text-text-tertiary">Accounts</div>
            <div className="font-mono text-body font-medium">{model.assignedAccounts}</div>
          </div>
          <div className="text-right">
            <div className="text-caption text-text-tertiary">AUM</div>
            <div className="font-mono text-body font-medium">{formatCurrency(model.totalAUM, true)}</div>
          </div>
          <div className="text-right">
            <div className="text-caption text-text-tertiary">Version</div>
            <div className="font-mono text-body font-medium">v{model.currentVersion}</div>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 text-text-tertiary" />}
        </div>
      </button>

      {expanded && (
        <CardContent className="border-t border-border-primary pt-4">
          {/* Model config row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2 text-caption">
              <Shield className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-secondary">Drift Tolerance:</span>
              <span className="font-mono font-medium">{(model.driftTolerance * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2 text-caption">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-secondary">Rebalance:</span>
              <span className="font-medium">{REBALANCE_FREQ_LABELS[model.rebalanceFrequency]}</span>
            </div>
            <div className="flex items-center gap-2 text-caption">
              <Clock className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-secondary">Last Rebalance:</span>
              <span className="font-mono">{model.lastRebalanceDate}</span>
            </div>
            <div className="flex items-center gap-2 text-caption">
              <Users className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-text-secondary">Accounts:</span>
              <span className="font-mono font-medium">{model.assignedAccounts}</span>
            </div>
          </div>

          {/* Current allocation bar */}
          <div className="mb-4">
            <h4 className="text-caption font-medium text-text-secondary mb-2">Current Allocation</h4>
            <div className="flex gap-1 h-8 rounded overflow-hidden">
              {model.assetClasses.map((ac) => (
                <div
                  key={ac.assetClass}
                  className={cn(
                    'flex items-center justify-center text-[10px] font-medium text-white',
                    ASSET_CLASS_COLORS[ac.assetClass] ?? 'bg-purple-500',
                  )}
                  style={{ width: `${ac.targetWeight * 100}%` }}
                  title={`${ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass}: ${(ac.targetWeight * 100).toFixed(0)}%`}
                >
                  {ac.targetWeight >= 0.08 && `${(ac.targetWeight * 100).toFixed(0)}%`}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {model.assetClasses.map((ac) => (
                <span key={ac.assetClass} className="text-[11px] text-text-secondary">
                  {ASSET_CLASS_LABELS[ac.assetClass] ?? ac.assetClass}: <span className="font-mono font-medium">{(ac.targetWeight * 100).toFixed(0)}%</span>
                </span>
              ))}
            </div>
          </div>

          {/* Version timeline */}
          <div>
            <h4 className="text-caption font-medium text-text-secondary mb-2">Version History</h4>
            <VersionTimeline versions={model.versions} />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function ModelGovernancePage() {
  const { data: models, isLoading } = useModelGovernance()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }

  if (!models) return <div className="py-12 text-center text-caption text-text-tertiary">Unable to load model governance data</div>

  const totalModels = models.length
  const totalAccounts = models.reduce((s, m) => s + m.assignedAccounts, 0)
  const totalAUM = models.reduce((s, m) => s + m.totalAUM, 0)
  const pendingChanges = models.filter((m) => m.versions.some((v) => v.status === 'pending_approval')).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/portfolios" className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-page-title text-text-primary">Model Governance</h1>
          <p className="text-caption text-text-secondary">Model portfolio versioning, change history, and propagation tracking</p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Models"
          value={totalModels.toString()}
          change={{ value: 'Active models', direction: 'neutral' }}
        />
        <MetricCard
          label="Assigned Accounts"
          value={totalAccounts.toString()}
          change={{ value: 'Across all models', direction: 'neutral' }}
        />
        <MetricCard
          label="Total Model AUM"
          value={formatCurrency(totalAUM, true)}
          change={{ value: 'Under model management', direction: 'neutral' }}
        />
        <MetricCard
          label="Pending Changes"
          value={pendingChanges.toString()}
          change={{
            value: pendingChanges > 0 ? 'Awaiting IC approval' : 'All current',
            direction: pendingChanges > 0 ? 'down' : 'up',
          }}
        />
      </div>

      {/* Model list */}
      <Card>
        <CardHeader>Model Portfolios</CardHeader>
        <CardContent className="space-y-3">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
