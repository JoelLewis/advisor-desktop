import { Link } from 'react-router-dom'
import { Tag } from '@/kit/tag/Tag'
import { fmtDate, fmtEasternRange } from '@/kit/measure'
import { useMeeting, useMeetings } from '@/hooks/use-meetings'
import { useThread } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import { MeetingControls } from '@/workspace/meeting/MeetingControls'
import { AgendaEditor } from '@/workspace/meeting/AgendaEditor'
import { TaskTable } from '@/workspace/meeting/TaskTable'
import { agendaFindings } from '@/workspace/meeting/agenda-findings'
import { MEETING_STATE_TAG } from '@/workspace/meeting/meeting-words'
import type { Directory, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'
import { Unbroken } from '@/kit/unbroken/Unbroken'

type MeetingPanelProps = { thread: Thread; directory: Directory; onRecorded: (actId: string) => void }

/** The meeting a team thread is for, if any: when and where, its state, the advisor's next step, the agenda, and once filed, the tasks. */
export function MeetingPanel({ thread, directory, onRecorded }: MeetingPanelProps) {
  const meetings = useMeetings()
  if (meetings.isPending) return null
  if (meetings.isError) return <p role="alert" className="py-5 text-body">{meetings.error.message}</p>
  const summary = meetings.data.find((m) => m.threadId === thread.id)
  return summary ? <MeetingSection eventId={summary.eventId} thread={thread} directory={directory} onRecorded={onRecorded} /> : null
}

function MeetingSection({ eventId, thread, directory, onRecorded }: MeetingPanelProps & { eventId: string }) {
  const { viewerId } = useViewer()
  const meeting = useMeeting(eventId)
  const detail = useThread(thread.id)
  if (meeting.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the meeting…</p>
  if (meeting.isError) return <p role="alert" className="py-5 text-body">{meeting.error.message}</p>
  const m = meeting.data
  const canPrepare = (directory.permissions[viewerId] ?? []).includes('prepare_meeting')
  return (
    <ContextSection title="Meeting">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-body font-semibold">{m.event.title}</span>
          <Tag tone={m.state === 'filed' ? 'solid' : 'outline'}>{MEETING_STATE_TAG[m.state]}</Tag>
        </div>
        <span className="tabular text-body text-ink-2"><Unbroken text={[fmtDate(m.start), fmtEasternRange(m.start, m.end), ...(m.event.location ? [m.event.location] : [])].join(' · ')} /></span>
      </div>
      <Link to={meetingFullViewHref(m.eventId, thread.id)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the meeting view <span aria-hidden="true">↗</span>
      </Link>
      <MeetingControls meeting={m} canPrepare={canPrepare} onRecorded={onRecorded} />
      <h3 className="text-label uppercase text-ink-3">Agenda</h3>
      <AgendaEditor meeting={m} findings={agendaFindings(detail.data?.messages ?? [])} editable={canPrepare && m.state === 'scheduled'} />
      {m.state === 'filed' ? <TaskTable caption="Follow-up tasks" tasks={m.tasks} directory={directory} /> : null}
    </ContextSection>
  )
}
