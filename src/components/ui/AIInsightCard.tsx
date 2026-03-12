import { Sparkles, AlertTriangle, TrendingUp, Info, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/ui-store'
import type { AIInsight } from '@/types/ai'

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    iconColor: 'text-accent-purple',
    bgColor: 'bg-accent-purple/5',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  opportunity: {
    icon: TrendingUp,
    iconColor: 'text-accent-green',
    bgColor: 'bg-accent-green/5',
  },
} as const

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  const navigate = useNavigate()
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const config = SEVERITY_CONFIG[insight.severity]
  const Icon = config.icon

  function handleAction() {
    if (insight.actionRoute) {
      navigate(insight.actionRoute)
    } else if (insight.actionAI) {
      setInitialMessage(insight.actionAI)
    }
  }

  return (
    <div className={`rounded-lg border border-accent-purple/15 ${config.bgColor} p-3`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent-purple" />
          <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-text-secondary">{insight.title}</p>
          <p className="mt-0.5 text-caption text-text-secondary">{insight.body}</p>
          {insight.metric && (
            <p className="mt-1 font-mono text-caption font-medium text-text-primary">
              {insight.metric.label}: {insight.metric.value}
            </p>
          )}
          {insight.actionLabel && (insight.actionRoute || insight.actionAI) && (
            <button
              onClick={handleAction}
              className="mt-1.5 flex items-center gap-1 text-caption font-medium text-accent-purple hover:underline"
            >
              {insight.actionLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AIInsightStack({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null
  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <AIInsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  )
}
