import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { cn, formatPercent } from '@/lib/utils'
import type { StressScenario } from '@/types/risk'

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
