import { cn } from '@/lib/utils'

type AvatarProps = {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

const SIZES = {
  sm: 'h-7 w-7 text-mono-sm',
  md: 'h-9 w-9 text-caption',
  lg: 'h-12 w-12 text-body',
} as const

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', SIZES[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-accent-blue/10 font-medium text-accent-blue',
        SIZES[size],
        className,
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
