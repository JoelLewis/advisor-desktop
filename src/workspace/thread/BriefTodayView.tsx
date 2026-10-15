import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fmtEasternStamp, fmtEasternWindow, fmtQuantity } from '@/kit/measure'
import { reconciliationHref } from '@/workspace/full-views/reference-href'
import type { Message, TodayLine } from '@/types/workspace'
import { TODAY_MEETING_STATE } from './brief-today-words'
import { LINK_TARGET } from '@/kit/link-target'

type Today = Extract<Message, { kind: 'brief_today' }>
const LINK = `${LINK_TARGET} shrink-0 text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** The day as it stands: one line per thing happening, in time order, each with its one action. */
export function BriefTodayView({ today }: { today: Today }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <h2 id={titleId} className="border-b border-ink pb-2 text-label uppercase text-ink-2">Today</h2>
      {today.lines.length === 0 ? <p className="text-body text-ink-3">Nothing else is on the calendar today.</p> : (
        <ol className="flex flex-col">
          {today.lines.map((line) => <li key={keyOf(line)} className="border-b border-rule py-2 last:border-b-0">{lineOf(line, today)}</li>)}
        </ol>
      )}
    </section>
  )
}

const keyOf = (line: TodayLine) => (line.kind === 'reconciliation' ? 'reconciliation' : `${line.kind}:${line.threadId}`)

function Row({ when, children, action }: { when?: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] items-baseline gap-x-4 gap-y-1 narrow:grid-cols-[9rem_1fr_auto]">
      <span className="tabular text-body text-ink-2">{when}</span>
      <span className="text-copy">{children}</span>
      <span className="col-start-2 narrow:col-start-auto">{action}</span>
    </div>
  )
}

function lineOf(line: TodayLine, today: Today): ReactNode {
  const now = today.at
  switch (line.kind) {
    case 'release':
      return <Row when={fmtEasternStamp(line.at, now)} action={<Link to={`/t/${encodeURIComponent(line.threadId)}`} className={LINK}>Open the team thread</Link>}>
        {`Orders await compliance review · ${line.accountName} · v${line.version}`}</Row>
    case 'meeting':
      return <Row when={fmtEasternWindow(line.start, line.end, now)} action={<Link to={`/t/${encodeURIComponent(line.threadId)}`} className={LINK}>Open the meeting thread</Link>}>
        {`${line.title} · ${TODAY_MEETING_STATE[line.state]}`}</Row>
    case 'coffee':
      return <Row when={fmtEasternStamp(line.start, now)} action={<Link to={`/t/${encodeURIComponent(line.threadId)}`} className={LINK}>Open her thread</Link>}>
        {`Coffee with ${line.prospectName} · ${line.formCrs === 'due' ? 'Form CRS due before it (firm policy)' : 'Form CRS delivered'}`}</Row>
    case 'reconciliation':
      return <Row action={<Link to={reconciliationHref(today.threadId)} className={LINK}>Open reconciliation</Link>}>
        {`Reconciliation · ${fmtQuantity(line.openBreaks)} open ${line.openBreaks === 1 ? 'break' : 'breaks'}`}</Row>
  }
}
