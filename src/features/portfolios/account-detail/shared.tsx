import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { cn, formatPercent, formatDate } from '@/lib/utils'
import type { StressScenario, RiskMetrics } from '@/types/risk'
import type { CurrencyCode } from '@/types/currency'

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-caption font-medium">{value}</span>
    </div>
  )
}

export function RiskMetricCard({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <Card>
      <CardContent>
        <p className="text-caption text-text-secondary">{label}</p>
        <p className={cn('font-mono text-section-header', negative && 'text-accent-red')}>{value}</p>
      </CardContent>
    </Card>
  )
}

/**
 * The risk-metric grid plus its disclosure paragraph — one block, read by both `RiskTab.tsx`
 * (account detail) and `RiskAnalyticsPage.tsx` (the standalone risk page). These were two
 * hand-typed copies of the same JSX; §9.4's fix touched the copy in each and would have needed a
 * third edit the next time either drifted. Extracted here so there is exactly one place that says
 * what tracking error means and what it's measured against.
 */
export function RiskMetricsPanel({
  risk,
  formatWithConversion,
}: {
  risk: RiskMetrics
  formatWithConversion: (value: number, from: CurrencyCode, opts?: { compact?: boolean }) => string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Beta is not benchmark-relative — it is sensitivity to the global equity market.
            Only tracking error is measured against the account's model benchmark. */}
        <RiskMetricCard label="Beta vs global equity market" value={risk.beta.toFixed(2)} />
        <RiskMetricCard label="Sharpe ratio" value={risk.sharpe.toFixed(2)} />
        <RiskMetricCard label="Sortino ratio" value={risk.sortino.toFixed(2)} />
        <RiskMetricCard label="Max drawdown (modelled, 3y)" value={`${(risk.maxDrawdown * 100).toFixed(1)}%`} negative />
        <RiskMetricCard label="Standard deviation (annualised)" value={`${(risk.standardDeviation * 100).toFixed(1)}%`} />
        {/* `var95` is already USD — riskProfileFor converts the account value at the FX
            boundary — so it is formatted from USD, not from the account's base currency. */}
        <RiskMetricCard
          label={`VaR (${(risk.var95Confidence * 100).toFixed(0)}%), ${risk.var95Horizon}, ${risk.var95Method}`}
          value={formatWithConversion(risk.var95, 'USD', { compact: true })}
          negative
        />
      </div>
      <p className="text-caption text-text-tertiary">
        Value at risk is an estimate: {(risk.var95Confidence * 100).toFixed(0)}% confidence,
        {' '}{risk.var95Horizon} horizon, {risk.var95Method} method
        {' '}({(risk.var95Percent * 100).toFixed(2)}% of account value). Sharpe and Sortino use a
        {' '}{(risk.riskFreeRate * 100).toFixed(1)}% risk-free rate; Sortino divides by
        {' '}{(risk.downsideDeviation * 100).toFixed(2)}% downside deviation. Ex-ante tracking
        {' '}error against {risk.benchmark} is {(risk.trackingError * 100).toFixed(2)}% — modelled
        {' '}active risk from the account's active weights against the model's target weights,
        {' '}assuming 0.35 correlation across asset classes, not realised return dispersion. As of{' '}
        {formatDate(risk.asOf)}. Hypothetical — not a prediction.
      </p>
    </div>
  )
}

export function StatCell({ label, value, colorClass, badge }: { label: string; value: string; colorClass?: string; badge?: string }) {
  return (
    <div>
      <p className="text-caption text-text-secondary">{label}</p>
      <p className={cn('font-mono text-section-header', colorClass)}>
        {value}
        {badge && <span className="ml-1 text-[10px] font-normal text-text-tertiary">{badge}</span>}
      </p>
    </div>
  )
}

export const StressScenarioRow = memo(function StressScenarioRow({ scenario }: { scenario: StressScenario }) {
  return (
    <div className="rounded-md border border-border-primary p-4">
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
              {formatPercent(pi.impactPercent * 100)} (<CurrencyValue value={pi.impact} compact />)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
