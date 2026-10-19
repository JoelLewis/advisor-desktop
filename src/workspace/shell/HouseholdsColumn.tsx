import { NavLink } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney } from '@/kit/measure'
import { cn } from '@/lib/utils'
import { useHouseholdBook, useThreads } from '@/hooks/use-workspace'
import { householdFullViewHref } from '@/workspace/full-views/full-view-href'
import { markerWords, statusLineOf } from '@/workspace/book/queue-words'
import type { HouseholdRow } from '@/types/workspace-book'

const ROW = 'flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2 hover:bg-face'

const BRIEF_THREAD_ID = 'th-brief'

/** The Brief is one viewer's own thread: its link is offered only to someone whose thread list holds it. */
function YourDay() {
  const threads = useThreads()
  if (!threads.data?.some((t) => t.id === BRIEF_THREAD_ID)) return null
  return (
    <Pane title="Your day">
      <ul className="flex flex-col">
        <li>
          <NavLink to={`/t/${BRIEF_THREAD_ID}`} className={({ isActive }) => cn(ROW, 'text-body', isActive ? 'border-ink bg-face font-semibold' : 'border-transparent')}>Brief</NavLink>
        </li>
      </ul>
    </Pane>
  )
}

/** Households mode: the day's Brief (for whoever has one), who needs the advisor today, then every household A–Z. */
export function HouseholdsColumn() {
  const book = useHouseholdBook()
  return (
    <>
      <YourDay />
      {book.isPending ? <p role="status" className="text-body text-ink-3">Loading households…</p>
        : book.isError ? <p role="alert" className="text-body">{book.error.message}</p>
        : (
          <>
            <HouseholdList title="Needs you today" rows={book.data.queue} asOf={book.data.asOf} empty="No household needs you today." />
            <HouseholdList title="All households" rows={book.data.households} asOf={book.data.asOf} />
          </>
        )}
    </>
  )
}

function HouseholdList({ title, rows, asOf, empty }: { title: string; rows: HouseholdRow[]; asOf: string; empty?: string }) {
  return (
    <Pane title={title}>
      {rows.length === 0 && empty ? <p className="text-body text-ink-3">{empty}</p> : (
        <ul aria-label={title} className="flex flex-col">
          {rows.map((row) => <HouseholdRowLink key={row.householdId} row={row} asOf={asOf} />)}
        </ul>
      )}
    </Pane>
  )
}

function HouseholdRowLink({ row, asOf }: { row: HouseholdRow; asOf: string }) {
  const line = statusLineOf(row, asOf)
  const markers = markerWords(row.markers)
  return (
    <li>
      <NavLink to={householdFullViewHref(row.householdId)} className={({ isActive }) => cn(ROW, isActive ? 'border-ink bg-face' : 'border-transparent')}>
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-body">{row.name}</span>
          <span className="tabular text-label text-ink-3">{`${fmtMoney(row.managedValue)} ${UNIT.usd}`}</span>
        </span>
        {line ? <span data-part="status-line" className="text-label normal-case text-ink-2">{line}</span> : null}
        {markers.length > 0 ? <span className="flex flex-wrap gap-1.5">{markers.map((m) => <Tag key={m}>{m}</Tag>)}</span> : null}
      </NavLink>
    </li>
  )
}
