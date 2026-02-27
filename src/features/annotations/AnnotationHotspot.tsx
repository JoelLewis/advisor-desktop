import { cn } from '@/lib/utils'
import type { AnnotationTheme } from '@/types/annotation'

const THEME_COLORS: Record<AnnotationTheme, { bg: string; ring: string; cssVar: string }> = {
  ai_embedded: { bg: 'bg-accent-purple', ring: 'ring-accent-purple/30', cssVar: '#7C3AED' },
  actionable_ux: { bg: 'bg-accent-blue', ring: 'ring-accent-blue/30', cssVar: '#2563EB' },
  smart_workflows: { bg: 'bg-accent-green', ring: 'ring-accent-green/30', cssVar: '#059669' },
  batch_actions: { bg: 'bg-accent-amber', ring: 'ring-accent-amber/30', cssVar: '#D97706' },
}

type Props = {
  number: number
  theme: AnnotationTheme
  active: boolean
  style: React.CSSProperties
  onClick: () => void
}

export function AnnotationHotspot({ number, theme, active, style, onClick }: Props) {
  const colors = THEME_COLORS[theme]

  return (
    <button
      onClick={onClick}
      aria-label={`Annotation ${number}`}
      className={cn(
        'pointer-events-auto absolute flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition-transform duration-150',
        colors.bg,
        active ? 'scale-110 ring-4' : 'animate-hotspot-pulse',
        active && colors.ring,
      )}
      style={{
        ...style,
        '--hotspot-color': colors.cssVar,
      } as React.CSSProperties}
    >
      {number}
    </button>
  )
}

export { THEME_COLORS }
