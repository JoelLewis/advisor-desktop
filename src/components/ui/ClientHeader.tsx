import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { Client } from '@/types/client'

const SEGMENT_VARIANT = {
  platinum: 'blue',
  gold: 'yellow',
  silver: 'default',
  bronze: 'default',
} as const

type ClientHeaderProps = {
  client: Client
  className?: string
}

export function ClientHeader({ client, className }: ClientHeaderProps) {
  return (
    <div className={cn('flex items-center gap-4 rounded-lg border border-border-primary bg-surface-primary p-4', className)}>
      <Avatar name={client.fullName} src={client.photo} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-page-title truncate">{client.fullName}</h1>
          <Badge variant={SEGMENT_VARIANT[client.segment]}>{client.tier.label}</Badge>
        </div>
        <div className="mt-1 flex items-center gap-4 text-caption text-text-secondary">
          <span>{client.occupation}</span>
          <span className="text-border-secondary">|</span>
          <span>{client.email}</span>
          <span className="text-border-secondary">|</span>
          <span>{client.phone}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-caption text-text-secondary">Total AUM</p>
        <p className="font-mono text-page-title">{formatCurrency(client.totalAUM, true)}</p>
      </div>
    </div>
  )
}
