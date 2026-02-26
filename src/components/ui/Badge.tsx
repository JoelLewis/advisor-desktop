import { cn } from '@/lib/utils'

const VARIANTS = {
  default: 'bg-surface-tertiary text-text-secondary',
  blue: 'bg-accent-blue/10 text-accent-blue',
  green: 'bg-accent-green/10 text-accent-green',
  red: 'bg-accent-red/10 text-accent-red',
  purple: 'bg-accent-purple/10 text-accent-purple',
  yellow: 'bg-amber-50 text-amber-700',
} as const

type BadgeProps = {
  children: React.ReactNode
  variant?: keyof typeof VARIANTS
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
