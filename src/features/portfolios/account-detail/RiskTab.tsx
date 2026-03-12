import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { RiskMetricCard, StressScenarioRow } from './shared'
import type { Account } from '@/types/account'
import type { CurrencyCode } from '@/types/currency'
import type { RiskMetrics, FactorExposure, StressScenario } from '@/types/risk'

const FACTOR_COLORS = { positive: '#2563EB', negative: '#DC2626', benchmark: '#94A3B8' }

type RiskTabProps = {
  risk: RiskMetrics | undefined
  factors: FactorExposure[] | undefined
  stress: StressScenario[] | undefined
  account: Account
  formatWithConversion: (value: number, from: CurrencyCode, opts?: { compact?: boolean }) => string
}

export function RiskTab({ risk, factors, stress, account, formatWithConversion }: RiskTabProps) {
  return (
    <div className="space-y-6">
      {risk && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <RiskMetricCard label="Beta" value={risk.beta.toFixed(2)} />
          <RiskMetricCard label="Sharpe Ratio" value={risk.sharpe.toFixed(2)} />
          <RiskMetricCard label="Sortino Ratio" value={risk.sortino.toFixed(2)} />
          <RiskMetricCard label="Max Drawdown" value={`${(risk.maxDrawdown * 100).toFixed(1)}%`} negative />
          <RiskMetricCard label="Std Deviation" value={`${(risk.standardDeviation * 100).toFixed(1)}%`} />
          <RiskMetricCard label="VaR (95%)" value={formatWithConversion(risk.var95, account.baseCurrency ?? 'USD', { compact: true })} negative />
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
