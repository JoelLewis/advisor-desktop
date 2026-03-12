import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary: 'bg-accent-blue text-white hover:bg-accent-blue/90 shadow-xs',
  secondary: 'bg-surface-primary text-text-primary border border-border-primary hover:bg-surface-tertiary',
  ghost: 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
  danger: 'bg-accent-red text-white hover:bg-accent-red/90',
  ai: 'bg-accent-purple/10 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/15',
} as const

const SIZES = {
  sm: 'h-8 px-3 text-caption gap-1.5',
  md: 'h-9 px-4 text-body gap-2',
  lg: 'h-10 px-5 text-body gap-2',
} as const

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
