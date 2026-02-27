import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type ChangeDirection = 'up' | 'down' | 'neutral'

type DenseMetric = {
  label: string
  value: string
  change?: { value: string; direction: ChangeDirection }
  onClick?: () => void
}

function ChangeIndicator({ value, direction }: { value: string; direction: ChangeDirection }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const color =
    direction === 'up'
      ? 'text-accent-green'
      : direction === 'down'
        ? 'text-accent-red'
        : 'text-text-tertiary'

  return (
    <span className={`inline-flex items-center gap-0.5 ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[11px]">{value}</span>
    </span>
  )
}

type DenseMetricsBarProps = {
  metrics: DenseMetric[]
}

export function DenseMetricsBar({ metrics }: DenseMetricsBarProps) {
  return (
    <div className="flex items-center rounded-lg border border-border-primary bg-surface-primary px-2 h-[52px]">
      {metrics.map((metric, i) => {
        const content = (
          <>
            <span className="text-[11px] uppercase tracking-wide text-text-tertiary whitespace-nowrap">
              {metric.label}
            </span>
            <span className="font-mono text-sm font-semibold text-text-primary whitespace-nowrap">
              {metric.value}
            </span>
            {metric.change && (
              <ChangeIndicator
                value={metric.change.value}
                direction={metric.change.direction}
              />
            )}
          </>
        )

        return (
          <div key={metric.label} className="flex items-center">
            {i > 0 && (
              <div className="mx-3 h-7 w-px bg-border-primary shrink-0" />
            )}
            {metric.onClick ? (
              <button
                onClick={metric.onClick}
                className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-surface-tertiary"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1.5">
                {content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export type { DenseMetric }
