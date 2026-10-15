import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { THREAD_GROUP_TITLE, teamWords } from '@/workspace/people/visibility-words'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { fmtEasternRange, fmtDayMonthYear } from '@/kit/measure'
import { useHousehold, useMeeting } from '@/hooks/use-meetings'
import { useDirectory, useThread } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { clientFullViewHref, householdFullViewHref } from '@/workspace/full-views/full-view-href'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import { HouseholdSummaryPanes } from '@/workspace/household/HouseholdSummaryPanes'
import { joinWords } from '@/lib/words'
import type { Directory } from '@/types/workspace'
import type { MeetingView } from '@/types/workspace-meeting'
import { AgendaEditor } from './AgendaEditor'
import { MeetingControls } from './MeetingControls'
import { TaskTable } from './TaskTable'
import { TranscriptNotes } from './TranscriptNotes'
import { agendaFindings } from './agenda-findings'
import { MEETING_STATE_TAG } from './meeting-words'
import { FILED_RECORD_ID, SAVE_BEFORE_FILING } from './note-words'
import { Unbroken } from '@/kit/unbroken/Unbroken'
import { LINK_TARGET } from '@/kit/link-target'

const LINK_CLASS = 'underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

export function MeetingPage() {
  const { eventId } = useParams()
  if (!eventId) throw new Error('The meeting route needs an event id')
  return <MeetingGate key={eventId} eventId={eventId} />
}

/** Firm-only: a client is told the meeting is not found, and a switch to someone who cannot see it goes home. */
function MeetingGate({ eventId }: { eventId: string }) {
  const meeting = useMeeting(eventId)
  const directory = useDirectory()
  const hiddenFromNewViewer = useGoHomeWhenHidden(meeting, 'this meeting')

  if (hiddenFromNewViewer || meeting.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the meeting…</p>
  if (meeting.isError) return isNotFound(meeting.error) ? <FullViewNotFound subject="Meeting" /> : <p role="alert" className="text-body">{meeting.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <MeetingFullView meeting={meeting.data} directory={directory.data} />
}

function MeetingFullView({ meeting, directory }: { meeting: MeetingView; directory: Directory }) {
  const [params] = useSearchParams()
  const from = params.get('from')
  const { viewerId } = useViewer()
  const focusAfter = useFocusAfter()
  const household = useHousehold(meeting.householdId)
  const thread = useThread(meeting.threadId)
  const [dirty, setDirty] = useState(false)
  const [recordedActId, setRecordedActId] = useState<string>()
  const filedActId = meeting.filed?.actId
  // Focus moves to the filed record once the refreshed meeting has put it on screen.
  useEffect(() => {
    if (recordedActId !== undefined && filedActId === recordedActId) focusAfter(FILED_RECORD_ID)
  }, [recordedActId, filedActId, focusAfter])
  const clientIds = new Set((household.data?.members ?? []).map((m) => m.clientId))
  const canPrepare = (directory.permissions[viewerId] ?? []).includes('prepare_meeting')
  const current = meeting.agenda[meeting.agenda.length - 1]
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={`${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" words={household.data ? teamWords(household.data.members.map((m) => m.name)) : THREAD_GROUP_TITLE.internal} />
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{meeting.title}</h1>
          <Tag tone={meeting.state === 'filed' ? 'solid' : 'outline'}>{MEETING_STATE_TAG[meeting.state]}</Tag>
        </div>
        <p className="tabular text-body text-ink-2"><Unbroken text={[fmtDayMonthYear(meeting.start), fmtEasternRange(meeting.start, meeting.end), ...(meeting.event.location ? [meeting.event.location] : [])].join(' · ')} /></p>
        <p className="text-body text-ink-2">{`With ${joinWords(meeting.event.attendees.map((a) => a.name))}`}</p>
        <nav aria-label="Full views" className="flex flex-wrap gap-x-4 gap-y-1 text-body *:inline-flex *:min-h-6 *:items-center coarse:*:min-h-11">
          <Link to={householdFullViewHref(meeting.householdId, meeting.threadId)} className={LINK_CLASS}>Household</Link>
          {meeting.event.attendees.filter((a) => clientIds.has(a.id)).map((a) => (
            <Link key={a.id} to={clientFullViewHref(a.id, meeting.threadId)} className={LINK_CLASS}>{a.name}</Link>
          ))}
        </nav>
      </header>
      <MeetingControls meeting={meeting} canPrepare={canPrepare} onRecorded={setRecordedActId}
        filingBlockedReason={dirty ? SAVE_BEFORE_FILING : undefined} />
      <Pane title="Agenda" meta={current ? `v${current.n}` : undefined}>
        <AgendaEditor meeting={meeting} findings={agendaFindings(thread.data?.messages ?? [])} editable={canPrepare && meeting.state === 'scheduled'} />
      </Pane>
      {meeting.transcript ? <TranscriptNotes meeting={meeting} directory={directory} editable={canPrepare && meeting.state === 'held'} onDirtyChange={setDirty} /> : null}
      {meeting.state === 'filed' ? (
        <Pane title="Follow-up tasks"><TaskTable caption="Follow-up tasks" tasks={meeting.tasks} directory={directory} /></Pane>
      ) : null}
      <section aria-label="Household reference" className="flex min-w-0 flex-col gap-3">
        <details>
          <summary className="min-h-6 cursor-pointer border-b border-ink pb-2 coarse:min-h-11 text-label uppercase text-ink-2">Household reference</summary>
          <div className="mt-4">
            {household.isPending ? <p role="status" className="text-body text-ink-3">Loading the household…</p>
              : household.isError ? <p role="alert" className="text-body">{household.error.message}</p>
              : <HouseholdSummaryPanes summary={household.data} />}
          </div>
        </details>
      </section>
    </div>
  )
}
