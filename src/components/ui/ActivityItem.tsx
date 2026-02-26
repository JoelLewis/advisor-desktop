import {
  ArrowRightLeft, Calendar, Mail, Phone, FileText,
  RefreshCw, Sparkles, Shield, Activity, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'
import type { ActivityItem as ActivityItemType, ActivityType } from '@/types/activity'

const ICON_MAP: Record<ActivityType, typeof Activity> = {
  trade: ArrowRightLeft,
  meeting: Calendar,
  email: Mail,
  call: Phone,
  document: FileText,
  rebalance: RefreshCw,
  nba: Zap,
  ai_action: Sparkles,
  compliance: Shield,
  system: Activity,
}

const ICON_COLOR: Record<ActivityType, string> = {
  trade: 'text-accent-blue',
  meeting: 'text-accent-blue',
  email: 'text-text-secondary',
  call: 'text-text-secondary',
  document: 'text-text-secondary',
  rebalance: 'text-accent-blue',
  nba: 'text-accent-purple',
  ai_action: 'text-accent-purple',
  compliance: 'text-accent-red',
  system: 'text-text-tertiary',
}

type ActivityItemProps = {
  item: ActivityItemType
  onClick?: (item: ActivityItemType) => void
}

export function ActivityItemRow({ item, onClick }: ActivityItemProps) {
  const Icon = ICON_MAP[item.type]

  return (
    <button
      onClick={() => onClick?.(item)}
      className={cn(
        'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-tertiary',
        !item.read && 'bg-accent-blue/[0.03]',
      )}
    >
      <div className={cn('mt-0.5 shrink-0', ICON_COLOR[item.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-body truncate', !item.read && 'font-semibold')}>
            {item.title}
          </p>
          <span className="shrink-0 font-mono text-mono-sm text-text-tertiary">
            {formatTime(item.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-caption text-text-secondary">
          {item.description}
        </p>
        {item.entityName && (
          <span className="mt-1 inline-block rounded bg-surface-tertiary px-1.5 py-0.5 text-caption text-text-secondary">
            {item.entityName}
          </span>
        )}
      </div>
      {!item.read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-blue" />
      )}
    </button>
  )
}
