import { cn } from '@/lib/utils'

const TONE = {
  outline: 'border border-ink-2 text-ink-2',
  solid: 'border border-ink bg-ink text-face',
  hatch: 'hatch-framed border border-rule-2 text-ink',
} as const

/** `wrap`: a long tag breaks across lines inside a narrow column instead of pushing past it. */
export function Tag({ children, tone = 'outline', wrap = false }: { children: string; tone?: keyof typeof TONE; wrap?: boolean }) {
  return (
    <span data-tone={tone} className={cn('inline-block px-1.5 py-0.5 text-label uppercase', wrap ? 'max-w-full whitespace-normal' : 'whitespace-nowrap', TONE[tone])}>
      {children}
    </span>
  )
}
