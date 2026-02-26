import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './Card'

type MetricCardProps = {
  label: string
  value: string
  change?: { value: string; direction: 'up' | 'down' | 'neutral' }
}

export function MetricCard({ label, value, change }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className="mt-1 font-mono text-section-header tracking-tight">{value}</p>
        {change && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-caption font-medium',
              change.direction === 'up' && 'text-accent-green',
              change.direction === 'down' && 'text-accent-red',
              change.direction === 'neutral' && 'text-text-tertiary',
            )}
          >
            {change.direction === 'up' && <TrendingUp className="h-3 w-3" />}
            {change.direction === 'down' && <TrendingDown className="h-3 w-3" />}
            {change.direction === 'neutral' && <Minus className="h-3 w-3" />}
            <span>{change.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
