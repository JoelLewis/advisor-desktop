import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { RiskMetricCard, StressScenarioRow } from './shared'
import { formatDate } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'
import type { RiskMetrics, FactorExposure, StressScenario } from '@/types/risk'

const FACTOR_COLORS = { positive: '#2563EB', negative: '#DC2626', benchmark: '#94A3B8' }

type RiskTabProps = {
  risk: RiskMetrics | undefined
  factors: FactorExposure[] | undefined
  stress: StressScenario[] | undefined
  formatWithConversion: (value: number, from: CurrencyCode, opts?: { compact?: boolean }) => string
}

export function RiskTab({ risk, factors, stress, formatWithConversion }: RiskTabProps) {
  return (
    <div className="space-y-6">
      {risk && (
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
            {' '}{(risk.downsideDeviation * 100).toFixed(2)}% downside deviation. Tracking error
            {' '}against {risk.benchmark} is {(risk.trackingError * 100).toFixed(2)}%. As of{' '}
            {formatDate(risk.asOf)}. Hypothetical — not a prediction.
          </p>
        </div>
      )}

      {factors && (
        <Card>
          <CardHeader>Factor Exposure</CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={factors} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis type="category" dataKey="factor" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} width={80} />
                <RechartsTooltip contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--border-primary)' }} />
                <Bar dataKey="exposure" name="Portfolio" radius={[0, 4, 4, 0]}>
                  {factors.map((f, i) => (
                    <Cell key={i} fill={f.exposure >= 0 ? FACTOR_COLORS.positive : FACTOR_COLORS.negative} />
                  ))}
                </Bar>
                <Bar dataKey="benchmark" name="Benchmark" fill={FACTOR_COLORS.benchmark} radius={[0, 4, 4, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stress && (
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
