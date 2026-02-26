import { cn } from '@/lib/utils'

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-skeleton-shimmer rounded-md bg-gradient-to-r from-surface-tertiary via-border-primary to-surface-tertiary bg-[length:200%_100%]',
        className,
      )}
    />
  )
}
