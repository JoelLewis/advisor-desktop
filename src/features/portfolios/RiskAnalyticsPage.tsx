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
import { RiskMetricCard, StressScenarioRow } from './account-detail/shared'
import { useAccounts } from '@/hooks/use-accounts'
import { useRiskMetrics, useSensitivity, useStressScenarios } from '@/hooks/use-portfolio'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { formatDate, formatPercent, cn } from '@/lib/utils'

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

function percentileColor(percentile: number): string {
  if (percentile <= 25) return 'text-accent-red'
  if (percentile >= 75) return 'text-accent-green'
  return 'text-text-primary'
}

export function RiskAnalyticsPage() {
  const { formatWithConversion } = useFormatCurrency()
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
        <div className="flex flex-col items-center py-12 gap-1">
          <p className="text-body text-text-tertiary">No accounts available</p>
          <p className="text-caption text-text-tertiary">Add accounts to your portfolio to view risk analytics.</p>
        </div>
      </div>
    )
  }

  const sensitivityData = sensitivity?.[sensitivityTab] ?? []
  const monteCarlo = sensitivity?.monteCarlo
  const keyPercentiles = monteCarlo?.percentiles.filter((p) =>
    (KEY_PERCENTILES as readonly number[]).includes(p.percentile),
  ) ?? []

  return (
    <div className="flex flex-col gap-6">
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
          className="rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body font-mono text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {/* C36 · currencies-and-fx — convert from the account's own base currency, so the
                  HKD account no longer reads as if its local-currency value were dollars. */}
              {acc.name} ({formatWithConversion(acc.totalValue, acc.baseCurrency ?? 'USD', { compact: true })})
            </option>
          ))}
        </select>
      </div>

      {/* Risk Metrics Grid */}
      {riskLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : risk ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <RiskMetricCard label={`Beta vs ${risk.benchmark}`} value={risk.beta.toFixed(2)} />
            <RiskMetricCard label="Sharpe ratio" value={risk.sharpe.toFixed(2)} />
            <RiskMetricCard label="Sortino ratio" value={risk.sortino.toFixed(2)} />
            <RiskMetricCard label="Max drawdown (modelled, 3y)" value={`${(risk.maxDrawdown * 100).toFixed(1)}%`} negative />
            <RiskMetricCard label="Standard deviation (annualised)" value={`${(risk.standardDeviation * 100).toFixed(1)}%`} />
            <RiskMetricCard
              label={`VaR (${(risk.var95Confidence * 100).toFixed(0)}%), ${risk.var95Horizon}, ${risk.var95Method}`}
              value={formatWithConversion(risk.var95, 'USD', { compact: true })}
              negative
            />
          </div>
          <p className="text-caption text-text-tertiary">
            Value at risk is an estimate: {(risk.var95Confidence * 100).toFixed(0)}% confidence,
            {' '}{risk.var95Horizon} horizon, {risk.var95Method} method
            {' '}({(risk.var95Percent * 100).toFixed(2)}% of account value). Sharpe uses a
            {' '}{(risk.riskFreeRate * 100).toFixed(1)}% risk-free rate. Tracking error against
            {' '}{risk.benchmark} is {(risk.trackingError * 100).toFixed(2)}%. As of{' '}
            {formatDate(risk.asOf)}. Hypothetical — not a prediction.
          </p>
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
                  tickFormatter={(v: number) => formatWithConversion(v, 'USD', { compact: true })}
                />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--border-primary)' }}
                  formatter={(value: number) => [formatWithConversion(value, 'USD'), 'Impact']}
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

      {/* Modelled return distribution */}
      <Card>
        <CardHeader
          action={
            monteCarlo ? (
              <Badge variant="blue">
                {monteCarlo.method}, {monteCarlo.horizon} horizon
              </Badge>
            ) : null
          }
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-text-secondary" />
            {/* C7 · forward-risk — this is a closed-form curve, so it is not described as a
                simulation and no longer claims a simulation count that never ran. */}
            Modelled return distribution
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
                    contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--border-primary)' }}
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
                                percentileColor(p.percentile),
                              )}
                            >
                              {formatWithConversion(p.value, 'USD', { compact: true })}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="text-caption text-text-tertiary">
                Modelled from this account's own assumptions: {(monteCarlo.expectedReturn * 100).toFixed(2)}%
                {' '}expected annual return, {(monteCarlo.volatility * 100).toFixed(2)}% annualised volatility,
                {' '}applied to {formatWithConversion(monteCarlo.baseValue, 'USD', { compact: true })} over
                {' '}{monteCarlo.horizon}. The percentile table and the chart come from the same
                {' '}{monteCarlo.method} distribution. Hypothetical — not a prediction.
              </p>
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
              <StressScenarioRow key={scenario.id} scenario={scenario} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
