import { Clock, MapPin, Video, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './Badge'
import type { CalendarEvent, MeetingType } from '@/types/calendar'
import { formatTime } from '@/lib/utils'

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  annual_review: 'Annual Review',
  quarterly_review: 'Quarterly Review',
  planning: 'Planning',
  prospect: 'Prospect',
  internal: 'Internal',
  ad_hoc: 'Ad Hoc',
}

type MeetingCardProps = {
  event: CalendarEvent
  onPrep?: (eventId: string) => void
}

export function MeetingCard({ event, onPrep }: MeetingCardProps) {
  const isZoom = event.location?.toLowerCase().includes('zoom')
  const isPast = new Date(event.endTime) < new Date()

  return (
    <div
      className={cn(
        'rounded-lg border border-border-primary bg-surface-primary p-3 transition-colors',
        isPast && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
            <span className="font-mono text-caption text-text-secondary">
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </span>
          </div>
          <h4 className="mt-1 truncate text-body-strong">{event.title}</h4>
          {event.clientName && (
            <p className="text-caption text-text-secondary">{event.clientName}</p>
          )}
          {event.location && (
            <div className="mt-1 flex items-center gap-1 text-caption text-text-tertiary">
              {isZoom ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={event.meetingType === 'prospect' ? 'green' : 'default'}>
            {MEETING_TYPE_LABELS[event.meetingType]}
          </Badge>
          {event.clientId && !isPast && (
            <button
              onClick={() => onPrep?.(event.id)}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 text-caption font-medium transition-colors',
                event.prepCompleted
                  ? 'text-accent-green'
                  : 'text-accent-purple hover:bg-accent-purple/10',
              )}
            >
              <Sparkles className="h-3 w-3" />
              {event.prepCompleted ? 'Prepped' : 'Prep'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
