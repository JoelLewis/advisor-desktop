import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { cn } from '@/lib/utils'
import { useFormatCurrency } from '@/hooks/use-format-currency'
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
  const { formatWithConversion } = useFormatCurrency()
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
          {client.householdId && (
            <>
              <span className="text-border-secondary">|</span>
              <Link
                to={`/households/${client.householdId}`}
                className="flex items-center gap-1 text-accent-blue transition-colors hover:text-accent-blue/80"
              >
                <Users className="h-3 w-3" />
                Household
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-caption text-text-secondary">Total AUM</p>
        <p className="font-mono text-page-title">{formatWithConversion(client.totalAUM, 'USD', { compact: true })}</p>
      </div>
    </div>
  )
}
