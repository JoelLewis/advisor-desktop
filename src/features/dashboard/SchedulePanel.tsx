import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MeetingCard } from '@/components/ui/MeetingCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardHeader } from '@/components/ui/Card'
import { MeetingPrepModal } from './MeetingPrepModal'
import { useSchedule } from '@/hooks/use-schedule'

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

type ModalState = {
  eventId: string
  tab: 'prep' | 'notes' | 'wrapup'
} | null

export function SchedulePanel() {
  const [selectedDate, setSelectedDate] = useState('2026-02-25')
  const [modalState, setModalState] = useState<ModalState>(null)
  const { data: events, isLoading } = useSchedule(selectedDate)

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] text-center text-caption font-medium text-text-secondary">
              {formatDateLabel(selectedDate)}
            </span>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      >
        Schedule
      </CardHeader>
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <MeetingCard
                key={event.id}
                event={event}
                onPrep={(id) => setModalState({ eventId: id, tab: 'prep' })}
                onNotes={(id) => setModalState({ eventId: id, tab: 'notes' })}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-caption text-text-tertiary">
            No meetings scheduled
          </div>
        )}
      </div>

      {modalState && (
        <MeetingPrepModal
          eventId={modalState.eventId}
          initialTab={modalState.tab}
          onClose={() => setModalState(null)}
        />
      )}
    </Card>
  )
}
