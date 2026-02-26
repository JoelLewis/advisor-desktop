import { useState } from 'react'
import { Mail, Phone, Video, MapPin, FileText, ArrowUpRight, ArrowDownLeft, Sparkles, User } from 'lucide-react'
import { useClientComms } from '@/hooks/use-client-comms'
import { cn } from '@/lib/utils'
import type { CommChannel } from '@/types/client-comms'

const CHANNEL_ICONS: Record<CommChannel, typeof Mail> = {
  email: Mail,
  phone: Phone,
  video: Video,
  in_person: MapPin,
  letter: FileText,
}

const CHANNEL_LABELS: Record<CommChannel, string> = {
  email: 'Email',
  phone: 'Phone',
  video: 'Video',
  in_person: 'In Person',
  letter: 'Letter',
}

type FilterChannel = 'all' | 'email' | 'phone' | 'video'

type ClientCommsTabProps = {
  clientId?: string
  clientName?: string
}

export function ClientCommsTab({ clientId, clientName }: ClientCommsTabProps) {
  const { data: comms, isLoading } = useClientComms(clientId)
  const [filter, setFilter] = useState<FilterChannel>('all')

  if (!clientId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-tertiary">
          <User className="h-6 w-6 text-text-tertiary" />
        </div>
        <div>
          <p className="text-body-strong text-text-secondary">No client selected</p>
          <p className="mt-1 text-caption text-text-tertiary">
            Navigate to a client, account, or household to view their communication history.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-surface-tertiary" />
        ))}
      </div>
    )
  }

  const filtered = filter === 'all'
    ? comms
    : comms?.filter((c) => c.channel === filter)

  const filters: { value: FilterChannel; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'video', label: 'Video' },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border-primary px-4 py-2.5">
        <p className="text-caption font-medium text-text-primary">{clientName ?? 'Client'}</p>
        <div className="mt-1.5 flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                filter === f.value
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comms list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!filtered || filtered.length === 0 ? (
          <p className="p-4 text-center text-caption text-text-tertiary">No communications found.</p>
        ) : (
          <div className="divide-y divide-border-primary">
            {filtered.map((comm) => {
              const ChannelIcon = CHANNEL_ICONS[comm.channel]
              return (
                <div key={comm.id} className="px-4 py-3 hover:bg-surface-secondary transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex items-center gap-1">
                      <ChannelIcon className="h-3.5 w-3.5 text-text-tertiary" />
                      {comm.direction === 'outbound'
                        ? <ArrowUpRight className="h-3 w-3 text-accent-blue" />
                        : <ArrowDownLeft className="h-3 w-3 text-accent-green" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption font-medium text-text-primary">{comm.subject}</span>
                        {comm.aiGenerated && (
                          <Sparkles className="h-3 w-3 shrink-0 text-accent-purple" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-secondary line-clamp-2">{comm.summary}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-text-tertiary">
                        <span>{CHANNEL_LABELS[comm.channel]}</span>
                        <span>·</span>
                        <span>{new Date(comm.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        {comm.duration && (
                          <>
                            <span>·</span>
                            <span>{comm.duration} min</span>
                          </>
                        )}
                        {comm.attachments && comm.attachments.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{comm.attachments.length} attachment{comm.attachments.length > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
