import { cn } from '@/lib/utils'

type CardProps = {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-primary bg-surface-primary shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

type CardHeaderProps = {
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

export function CardHeader({ children, className, action, as: Tag = 'h2' }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between border-b border-border-primary p-4', className)}>
      <Tag className="text-section-header text-text-primary">{children}</Tag>
      {action}
    </div>
  )
}

type CardContentProps = {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('p-4', className)}>{children}</div>
}
