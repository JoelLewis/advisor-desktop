import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { DataTable } from '@/kit/data-table/DataTable'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { fmtDate, fmtEasternRange, fmtEasternStamp, fmtDayMonthYear } from '@/kit/measure'
import { useHousehold } from '@/hooks/use-meetings'
import { isNotFound } from '@/workspace/is-not-found'
import { HouseholdSummaryPanes } from '@/workspace/household/HouseholdSummaryPanes'
import { CommunicationsList } from '@/workspace/household/CommunicationsList'
import { DOCUMENT_TYPE_WORDS, SIGNATURE_WORDS } from '@/workspace/household/household-words'
import { MEETING_STATE_TAG } from '@/workspace/meeting/meeting-words'
import type { HouseholdView as HouseholdReadModel, MeetingRef } from '@/types/workspace-household'
import { FullViewNotFound } from './FullViewNotFound'
import { clientFullViewHref, meetingFullViewHref } from './full-view-href'
import { billingHref } from './reference-href'
import { useGoHomeWhenHidden } from './use-go-home-when-hidden'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

export function HouseholdView() {
  const { householdId } = useParams()
  if (!householdId) throw new Error('The household route needs a household id')
  return <HouseholdGate key={householdId} householdId={householdId} />
}

/** Firm-only: a client is told the household is not found, and a switch to a client goes home. */
function HouseholdGate({ householdId }: { householdId: string }) {
  const household = useHousehold(householdId)
  const hiddenFromNewViewer = useGoHomeWhenHidden(household, 'this household')
  if (hiddenFromNewViewer || household.isPending) return <p role="status" className="text-body text-ink-3">Loading the household…</p>
  if (household.isError) return isNotFound(household.error) ? <FullViewNotFound subject="Household" /> : <p role="alert" className="text-body">{household.error.message}</p>
  return <HouseholdPage view={household.data} />
}

function HouseholdPage({ view }: { view: HouseholdReadModel }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {view.members.map((m) => (
            <li key={m.clientId} className="text-body text-ink-2">
              <Link to={clientFullViewHref(m.clientId, from)} className={LINK}>{m.name}</Link>
              <span className="tabular">{` · born ${fmtDate(m.dateOfBirth)}`}</span>
            </li>
          ))}
        </ul>
        <nav aria-label="Reference" className="flex flex-wrap gap-x-6 gap-y-1 *:inline-flex *:min-h-6 *:items-center coarse:*:min-h-11">
          <Link to={billingHref(view.id, from)} className={LINK}>Billing for this household</Link>
        </nav>
      </header>
      <HouseholdSummaryPanes summary={view} />
      <Pane title="Meetings">
        <MeetingList label="Upcoming meetings" meetings={view.meetings.upcoming} from={from} />
        <MeetingList label="Past meetings" meetings={view.meetings.past} from={from} />
      </Pane>
      <Pane title="Documents">
        <DataTable caption="Documents" rows={view.documents} getRowId={(d) => d.id} total={view.documents.length} noun={{ singular: 'document', plural: 'documents' }}
          columns={[
            { id: 'name', header: 'Document', wrap: true, cell: (d) => d.name },
            { id: 'client', header: 'Client', cell: (d) => d.clientName },
            { id: 'type', header: 'Type', cell: (d) => DOCUMENT_TYPE_WORDS[d.type] },
            { id: 'signature', header: 'Signature', cell: (d) => SIGNATURE_WORDS[d.signatureStatus] },
            { id: 'updated', header: 'Updated', cell: (d) => fmtDate(d.updatedOn), sortValue: (d) => d.updatedOn },
          ]} />
      </Pane>
      <Pane title="Communications"><CommunicationsList communications={view.communications} /></Pane>
      <Pane title="Activity">
        {view.activity.length === 0 ? <p className="text-body text-ink-3">No activity on file.</p> : (
          <ol aria-label="Activity" className="flex min-w-0 flex-col">
            {view.activity.map((a) => (
              <li key={a.id} className="flex min-w-0 flex-col gap-1 border-b border-rule py-3 first:pt-0 last:border-b-0">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-body font-semibold">{a.title}</span>
                  <span className="tabular ml-auto text-label text-ink-3">{fmtEasternStamp(a.at)}</span>
                </span>
                <span className="text-copy text-ink-2">{a.description}</span>
              </li>
            ))}
          </ol>
        )}
      </Pane>
    </div>
  )
}

function MeetingList({ label, meetings, from }: { label: string; meetings: MeetingRef[]; from: string | undefined }) {
  if (meetings.length === 0) return <p className="text-body text-ink-3">{`${label}: none.`}</p>
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {meetings.map((m) => (
        <li key={m.eventId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tabular text-body">{`${m.title} · ${fmtDayMonthYear(m.start)} · ${fmtEasternRange(m.start, m.end)}`}</span>
          {m.state !== 'calendar' ? <Tag>{MEETING_STATE_TAG[m.state]}</Tag> : null}
          {m.threadId ? <Link to={meetingFullViewHref(m.eventId, from ?? m.threadId)} className={LINK}>Open the meeting view <span aria-hidden="true">↗</span></Link> : null}
        </li>
      ))}
    </ul>
  )
}
