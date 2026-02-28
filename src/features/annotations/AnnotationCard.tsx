import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { THEME_COLORS } from './AnnotationHotspot'
import type { Annotation } from '@/types/annotation'

type Props = {
  annotation: Annotation
  active: boolean
  onClick: () => void
}

const THEME_BORDER: Record<string, string> = {
  ai_embedded: 'border-l-accent-purple',
  actionable_ux: 'border-l-accent-blue',
  smart_workflows: 'border-l-accent-green',
  batch_actions: 'border-l-accent-amber',
}

export function AnnotationCard({ annotation, active, onClick }: Props) {
  const colors = THEME_COLORS[annotation.theme]

  function scrollToElement() {
    const el = document.querySelector(`[data-annotation="${annotation.id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border border-l-[3px] p-3 transition-all duration-150',
        THEME_BORDER[annotation.theme],
        active
          ? 'bg-surface-tertiary border-border-secondary shadow-xs'
          : 'bg-surface-primary border-border-primary hover:bg-surface-tertiary',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', colors.bg)}
        >
          {annotation.number}
        </span>
        <span className="text-body-strong text-text-primary truncate">{annotation.title}</span>
      </div>

      {active && (
        <div className="mt-2 animate-fade-in">
          <p className="text-caption text-text-secondary leading-relaxed">{annotation.description}</p>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              scrollToElement()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                scrollToElement()
              }
            }}
            className="mt-2 inline-flex items-center gap-1 text-caption text-accent-blue hover:underline cursor-pointer"
          >
            <Eye className="h-3 w-3" />
            View element
          </div>
        </div>
      )}
    </button>
  )
}
