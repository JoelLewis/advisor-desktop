import { cn } from '@/lib/utils'

const TONE = {
  outline: 'border border-ink-2 text-ink-2',
  solid: 'bg-ink text-face',
  hatch: 'hatch border border-rule-2 text-ink',
} as const

export function Tag({ children, tone = 'outline' }: { children: string; tone?: keyof typeof TONE }) {
  return (
    <span data-tone={tone} className={cn('inline-block whitespace-nowrap px-1.5 py-0.5 text-label uppercase', TONE[tone])}>
      {children}
    </span>
  )
}
