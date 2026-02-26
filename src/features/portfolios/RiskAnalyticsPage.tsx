import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, AlertTriangle, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/use-accounts'
import { useRiskMetrics, useSensitivity, useStressScenarios } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'

type SensitivityTab = 'interestRate' | 'equity' | 'credit'

const SENSITIVITY_TAB_LABELS: Record<SensitivityTab, string> = {
  interestRate: 'Interest Rate',
  equity: 'Equity',
  credit: 'Credit',
}

function formatShockLabel(tab: SensitivityTab, shock: number): string {
  if (tab === 'interestRate' || tab === 'credit') {
    const sign = shock >= 0 ? '+' : ''
    return `${sign}${shock}bp`
  }
  const sign = shock >= 0 ? '+' : ''
  return `${sign}${shock}%`
}

const KEY_PERCENTILES = [5, 25, 50, 75, 95] as const

export function RiskAnalyticsPage() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts({})
  const [searchParams] = useSearchParams()

  const defaultAccountId = searchParams.get('accountId') ?? accounts?.[0]?.id ?? ''
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  // Use selected account, or default to first account once loaded
  const accountId = selectedAccountId || defaultAccountId

  const { data: risk, isLoading: riskLoading } = useRiskMetrics(accountId)
  const { data: sensitivity, isLoading: sensitivityLoading } = useSensitivity(accountId)
  const { data: stress, isLoading: stressLoading } = useStressScenarios(accountId)

  const [sensitivityTab, setSensitivityTab] = useState<SensitivityTab>('equity')

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-accent-blue" />
          <h1 className="text-page-title">Risk Analytics</h1>
        </div>
        <div className="py-12 text-center text-text-tertiary">No accounts available</div>
      </div>
    )
  }

  const sensitivityData = sensitivity?.[sensitivityTab] ?? []
  const monteCarlo = sensitivity?.monteCarlo
  const keyPercentiles = monteCarlo?.percentiles.filter((p) =>
    (KEY_PERCENTILES as readonly number[]).includes(p.percentile),
  ) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-accent-blue" />
          <h1 className="text-page-title">Risk Analytics</h1>
        </div>

        {/* Account Selector */}
        <select
          value={accountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body font-mono text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({formatCurrency(acc.totalValue, true)})
            </option>
          ))}
        </select>
      </div>

      {/* Risk Metrics Grid */}
      {riskLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : risk ? (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Beta</p>
              <p className="font-mono text-section-header">{risk.beta.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Sharpe Ratio</p>
              <p className="font-mono text-section-header">{risk.sharpe.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Sortino Ratio</p>
              <p className="font-mono text-section-header">{risk.sortino.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Max Drawdown</p>
              <p className="font-mono text-section-header text-accent-red">
                {(risk.maxDrawdown * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">Std Deviation</p>
              <p className="font-mono text-section-header">
                {(risk.standardDeviation * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-text-secondary">VaR (95%)</p>
              <p className="font-mono text-section-header text-accent-red">
                {formatCurrency(risk.var95, true)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Sensitivity Analysis */}
      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-1">
              {(['interestRate', 'equity', 'credit'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSensitivityTab(tab)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-caption font-medium transition-colors',
                    sensitivityTab === tab
                      ? 'bg-accent-blue text-white'
                      : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
                  )}
                >
                  {SENSITIVITY_TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-text-secondary" />
            Sensitivity Analysis
          </div>
        </CardHeader>
        <CardContent>
          {sensitivityLoading ? (
            <Skeleton className="h-72" />
          ) : sensitivityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sensitivityData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                  dataKey="shock"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v: number) => formatShockLabel(sensitivityTab, v)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v: number) => formatCurrency(v, true)}
                />
                <RechartsTooltip
                  formatter={(value: number) => [formatCurrency(value), 'Impact']}
                  labelFormatter={(label: number) => `Shock: ${formatShockLabel(sensitivityTab, label)}`}
                />
                <Bar dataKey="impact" name="Impact" radius={[4, 4, 0, 0]}>
                  {sensitivityData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.impact >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-text-tertiary">No sensitivity data available</div>
          )}
        </CardContent>
      </Card>

      {/* Monte Carlo Simulation */}
      <Card>
        <CardHeader
          action={
            monteCarlo ? (
              <Badge variant="blue">
                {monteCarlo.simulations.toLocaleString()} sims / {monteCarlo.horizon}
              </Badge>
            ) : null
          }
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-text-secondary" />
            Monte Carlo Simulation
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {stressLoading || sensitivityLoading ? (
            <Skeleton className="h-72" />
          ) : monteCarlo ? (
            <>
              {/* Histogram */}
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={monteCarlo.histogram}
                  margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis
                    dataKey="returnBucket"
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                    tickFormatter={(v: number) => formatPercent(v, 0)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [value, 'Frequency']}
                    labelFormatter={(label: number) => `Return: ${formatPercent(label, 1)}`}
                  />
                  <Bar dataKey="frequency" name="Frequency" radius={[4, 4, 0, 0]}>
                    {monteCarlo.histogram.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.returnBucket >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Key Percentiles Table */}
              {keyPercentiles.length > 0 && (
                <div>
                  <p className="mb-3 text-caption text-text-secondary font-medium">Key Percentiles</p>
                  <div className="overflow-hidden rounded-md border border-border-primary">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border-primary bg-surface-tertiary">
                          {keyPercentiles.map((p) => (
                            <th
                              key={p.percentile}
                              className="px-4 py-2 text-center text-caption font-medium text-text-secondary"
                            >
                              {p.percentile}th
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {keyPercentiles.map((p) => (
                            <td
                              key={p.percentile}
                              className={cn(
                                'px-4 py-3 text-center font-mono text-body-strong',
                                p.percentile <= 25 ? 'text-accent-red' : p.percentile >= 75 ? 'text-accent-green' : 'text-text-primary',
                              )}
                            >
                              {formatCurrency(p.value, true)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-text-tertiary">No Monte Carlo data available</div>
          )}
        </CardContent>
      </Card>

      {/* Stress Scenarios */}
      {stress && stress.length > 0 && (
        <Card>
          <CardHeader>Stress Scenarios</CardHeader>
          <CardContent className="space-y-4">
            {stress.map((scenario) => (
              <div key={scenario.id} className="rounded-md border border-border-primary p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-strong">{scenario.name}</p>
                    <p className="text-caption text-text-secondary">{scenario.description}</p>
                  </div>
                  <p className="font-mono text-section-header text-accent-red">
                    {(scenario.portfolioImpact * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="mt-3 space-y-1">
                  {scenario.positionImpacts.map((pi) => (
                    <div key={pi.positionId} className="flex items-center justify-between text-caption">
                      <span className="font-mono text-text-secondary">{pi.symbol}</span>
                      <span className={cn('font-mono', pi.impactPercent >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                        {formatPercent(pi.impactPercent * 100)} ({formatCurrency(pi.impact, true)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
