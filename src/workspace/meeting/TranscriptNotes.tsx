import { useState } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { cn } from '@/lib/utils'
import { THREAD_GROUP_TITLE } from '@/workspace/people/visibility-words'
import type { Directory } from '@/types/workspace'
import type { MeetingView, TranscriptSpeaker } from '@/types/workspace-meeting'
import { NotesEditor } from './NotesEditor'

type TranscriptNotesProps = { meeting: MeetingView; directory: Directory; editable: boolean; onDirtyChange: (dirty: boolean) => void }

/** The transcript beside the notes; a citation hovered or focused in the notes lights its transcript line. */
export function TranscriptNotes({ meeting, directory, editable, onDirtyChange }: TranscriptNotesProps) {
  const [highlighted, setHighlighted] = useState<string>()
  const transcript = meeting.transcript ?? []
  const speakerOf = (id: TranscriptSpeaker) => {
    const attendee = meeting.event.attendees.find((a) => a.id === id)
    if (!attendee) throw new Error(`Transcript speaker ${id} is not an attendee of ${meeting.eventId}`)
    return attendee.name
  }
  return (
    <div className="grid min-w-0 gap-6 split:grid-cols-2">
      <Pane title="Transcript" meta={THREAD_GROUP_TITLE.internal}>
        <ol aria-label="Transcript" className="flex min-w-0 flex-col">
          {transcript.map((line) => (
            <li key={line.id} id={`transcript-${line.id}`} data-highlighted={highlighted === line.id ? 'true' : undefined}
              className={cn('flex min-w-0 flex-col gap-0.5 border-l-2 py-2 pl-3', highlighted === line.id ? 'border-ink bg-face' : 'border-transparent')}>
              <span className="flex items-baseline gap-2 text-label">
                <span className="tabular text-ink-3">{line.id}</span>
                <span className="font-semibold text-ink-2">{speakerOf(line.speaker)}</span>
              </span>
              <span className="text-copy">{line.text}</span>
            </li>
          ))}
        </ol>
      </Pane>
      <NotesEditor key={meeting.filed?.actId ?? meeting.notesFingerprint ?? 'no-notes'} meeting={meeting} directory={directory} editable={editable}
        onCite={setHighlighted} onDirtyChange={onDirtyChange} speakerOf={speakerOf} />
    </div>
  )
}
