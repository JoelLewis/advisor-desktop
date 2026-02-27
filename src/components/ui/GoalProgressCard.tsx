import { cn } from '@/lib/utils'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import type { Goal } from '@/types/planning'

const STATUS_CONFIG = {
  on_track: { color: 'bg-accent-green', textColor: 'text-accent-green', label: 'On Track' },
  at_risk: { color: 'bg-amber-500', textColor: 'text-amber-600', label: 'At Risk' },
  off_track: { color: 'bg-accent-red', textColor: 'text-accent-red', label: 'Off Track' },
  not_analyzed: { color: 'bg-text-tertiary', textColor: 'text-text-tertiary', label: 'N/A' },
} as const

type GoalProgressCardProps = {
  goal: Goal
  compact?: boolean
}

export function GoalProgressCard({ goal, compact = false }: GoalProgressCardProps) {
  const { formatWithConversion } = useFormatCurrency()
  const config = STATUS_CONFIG[goal.status]
  const progressPercent = goal.targetAmount > 0
    ? Math.min((goal.currentFunding / goal.targetAmount) * 100, 100)
    : 0

  return (
    <div className={cn('rounded-lg border border-border-primary bg-surface-primary', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-body-strong">{goal.name}</h4>
          <p className="text-caption text-text-secondary">{goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}</p>
        </div>
        <div className="text-right">
          <div className={cn('font-mono text-section-header font-semibold', config.textColor)}>
            {goal.status === 'not_analyzed' ? 'N/A' : `${Math.round(goal.probability * 100)}%`}
          </div>
          <span className={cn('text-caption font-medium', config.textColor)}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-caption text-text-secondary">
          <span>{formatWithConversion(goal.currentFunding, 'USD', { compact: true })} funded</span>
          <span>{formatWithConversion(goal.targetAmount, 'USD', { compact: true })} target</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-surface-tertiary">
          <div
            className={cn('h-full rounded-full transition-all', config.color)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Shortfall drivers */}
      {!compact && goal.shortfallDrivers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {goal.shortfallDrivers.map((driver) => (
            <span key={driver} className="rounded bg-accent-red/10 px-1.5 py-0.5 text-mono-sm text-accent-red">
              {driver}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
