import { Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { AllocationChart } from '@/components/ui/AllocationChart'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { AIInsightStack } from '@/components/ui/AIInsightCard'
import { cn, formatDate } from '@/lib/utils'
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS, TAX_TREATMENT_LABELS } from '@/lib/labels'
import { COST_BASIS_LABELS } from './columns'
import { InfoRow, StatCell } from './shared'
import type { NavigateFunction } from 'react-router-dom'
import type { Account } from '@/types/account'
import type { CurrencyCode } from '@/types/currency'
import type { Position, DriftStatus } from '@/types/portfolio'
import type { RiskMetrics } from '@/types/risk'
import type { AIInsight } from '@/types/ai'

type OverviewTabProps = {
  account: Account
  positions: Position[] | undefined
  allocation: { assetClass: string; weight: number }[]
  totalGainLoss: number
  drift: DriftStatus | undefined
  risk: RiskMetrics | undefined
  insights: AIInsight[] | undefined
  id: string
  navigate: NavigateFunction
  formatWithConversion: (value: number, from: CurrencyCode, opts?: { compact?: boolean }) => string
}

export function OverviewTab({ account, positions, allocation, totalGainLoss, drift, risk, insights, id, navigate, formatWithConversion }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: Allocation + Key Stats */}
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>Asset Allocation</CardHeader>
          <CardContent className="flex items-start gap-8">
            <AllocationChart data={allocation} size="lg" />
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-3">
                <StatCell label="Total Value" value={formatWithConversion(account.totalValue, account.baseCurrency ?? 'USD', { compact: true })} />
                <StatCell label="Cash Balance" value={formatWithConversion(account.cashBalance, account.baseCurrency ?? 'USD', { compact: true })} />
                <StatCell
                  label="Unrealized G/L"
                  value={formatWithConversion(totalGainLoss, account.baseCurrency ?? 'USD', { compact: true })}
                  colorClass={totalGainLoss >= 0 ? 'text-accent-green' : 'text-accent-red'}
                />
                <StatCell label="Positions" value={String(positions?.length ?? 0)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UMA Sleeves */}
        {account.isUMA && account.sleeves && (
          <Card>
            <CardHeader>UMA Sleeves</CardHeader>
            <CardContent>
              <div className="space-y-2">
                {account.sleeves.map((sleeve) => (
                  <div key={sleeve.id} className="flex items-center justify-between rounded-md border border-border-primary px-4 py-3">
                    <div>
                      <p className="text-body-strong">{sleeve.name}</p>
                      <p className="text-caption text-text-secondary">{sleeve.strategy} — {sleeve.manager}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">{formatWithConversion(sleeve.value, account.baseCurrency ?? 'USD', { compact: true })}</p>
                      <div className="flex items-center gap-2 text-caption">
                        <span className="text-text-secondary">Target {(sleeve.targetAllocation * 100).toFixed(0)}%</span>
                        <span className={cn(
                          'font-mono',
                          Math.abs(sleeve.actualAllocation - sleeve.targetAllocation) > 0.02 ? 'text-accent-red' : 'text-accent-green',
                        )}>
                          Actual {(sleeve.actualAllocation * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        {insights && insights.length > 0 && (
          <AIInsightStack insights={insights} />
        )}
      </div>

      {/* Right: Account Info + Drift */}
      <div className="space-y-6">
        <Card>
          <CardHeader>Account Info</CardHeader>
          <CardContent className="space-y-2 text-body">
            <InfoRow label="Type" value={ACCOUNT_TYPE_LABELS[account.type] ?? account.type} />
            <InfoRow label="Tax" value={TAX_TREATMENT_LABELS[account.taxTreatment]} />
            <InfoRow label="Custodian" value={account.custodian} />
            <InfoRow label="Opened" value={formatDate(account.openDate)} />
            <InfoRow label="Last Rebalance" value={account.lastRebalance ? formatDate(account.lastRebalance) : 'Never'} />
            <InfoRow label="Model" value={account.modelId} />
            <InfoRow label="Cost Basis" value={COST_BASIS_LABELS[account.costBasisMethod] ?? account.costBasisMethod} />
          </CardContent>
        </Card>

        {drift && (
          <Card className={drift.needsRebalance ? 'border-l-[3px] border-l-accent-red' : ''}>
            <CardHeader
              action={
                <ActionMenu
                  context={{
                    entityType: 'account',
                    entityId: id,
                    entityName: account.name,
                    actionDescription: drift.needsRebalance ? 'Rebalance account — drift above threshold' : 'Analyze drift for account',
                  }}
                  variant="compact"
                />
              }
            >
              Drift Analysis
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-caption text-text-secondary">Total Drift</span>
                <span className={cn('font-mono text-section-header', drift.needsRebalance ? 'text-accent-red' : 'text-accent-green')}>
                  {(drift.totalDrift * 100).toFixed(1)}%
                </span>
              </div>
              {drift.needsRebalance && (
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-caption text-accent-red">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Rebalance recommended</span>
                  </div>
                  <button
                    onClick={() => navigate(`/portfolios/rebalance?accounts=${id}`)}
                    className="rounded bg-accent-blue px-2.5 py-1 text-caption font-medium text-white hover:bg-accent-blue/90"
                  >
                    Rebalance Now
                  </button>
                </div>
              )}
              <div className="space-y-1.5">
                {drift.assetClassDrifts.map((d) => (
                  <div key={d.assetClass} className="flex items-center justify-between text-caption">
                    <span className="text-text-secondary">{ASSET_CLASS_LABELS[d.assetClass] ?? d.assetClass}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-text-tertiary">{(d.target * 100).toFixed(0)}% / {(d.actual * 100).toFixed(0)}%</span>
                      <span className={cn('font-mono font-medium', d.drift > 0.02 ? 'text-accent-red' : 'text-accent-green')}>
                        {(d.drift * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI insight */}
        <Card className="border-l-[3px] border-l-accent-purple">
          <CardContent className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
            <div className="flex-1">
              <p className="text-body-strong text-accent-purple">AI Insight</p>
              <p className="mt-1 text-caption text-text-secondary">
                This account has {drift?.needsRebalance ? 'drifted beyond threshold and should be rebalanced' : 'acceptable drift levels'}.
                {totalGainLoss > 0 && ` Unrealized gains of ${formatWithConversion(totalGainLoss, account.baseCurrency ?? 'USD', { compact: true })} — consider tax-loss harvesting opportunities in underperforming positions.`}
                {risk && ` Sharpe ratio of ${risk.sharpe.toFixed(2)} indicates ${risk.sharpe > 1.2 ? 'strong' : 'moderate'} risk-adjusted returns.`}
              </p>
              <div className="mt-2">
                <ActionMenu
                  context={{
                    entityType: 'account',
                    entityId: id,
                    entityName: account.name,
                    actionDescription: 'Analyze AI insight and recommend next steps for this account',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
