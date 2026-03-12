import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useAIContext } from '@/hooks/use-ai-context'
import { cn } from '@/lib/utils'

type ContextBriefingProps = {
  screenType: string
  entityId?: string
}

export function ContextBriefing({ screenType, entityId }: ContextBriefingProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: briefing, isLoading } = useAIContext(screenType, entityId)

  if (isLoading || !briefing) return null

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-lg border-l-2 border-l-accent-purple/50 bg-accent-purple/5" aria-live="polite">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-accent-purple/10"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent-purple" />
          <span className="text-caption font-medium text-text-secondary">
            Context: {briefing.title}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-text-tertiary" />
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-3 pb-3">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {briefing.metrics.map((m) => (
              <div key={m.label} className="flex items-baseline justify-between">
                <span className="text-[10px] text-text-tertiary">{m.label}</span>
                <span className={cn(
                  'text-caption font-medium',
                  m.sentiment === 'positive' ? 'text-accent-green'
                    : m.sentiment === 'negative' ? 'text-accent-red'
                    : 'text-text-primary',
                )}>
                  {m.value}
                  {m.change && (
                    <span className="ml-1 text-[10px] text-text-tertiary">{m.change}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Highlights */}
          {briefing.highlights.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {briefing.highlights.map((h, i) => (
                <p key={i} className="text-[10px] text-text-secondary">
                  {h}
                </p>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="mt-1.5 text-[9px] text-text-tertiary">
            Based on data as of {new Date(briefing.asOf).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
