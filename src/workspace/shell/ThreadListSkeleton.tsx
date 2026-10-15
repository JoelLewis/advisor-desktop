import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import type { Visibility } from '@/kit/visibility/visibility'
import { VisibilityLegend } from './VisibilityLegend'

/** The advisor's list before it arrives, in the loaded list's order: the same panes, legend and row heights, so nothing below moves when it lands. */
const LINK_PANES: readonly { title: string; rows: number }[] = [{ title: 'Desk', rows: 2 }, { title: 'Reference', rows: 6 }]
const THREAD_PANES: readonly { visibility: Visibility; title: string; rows: number }[] = [
  { visibility: 'private', title: 'Private', rows: 1 },
  { visibility: 'internal', title: 'Internal', rows: 3 },
  { visibility: 'client', title: 'Clients and prospects', rows: 2 },
]

const BLANK_LINE = ' '

function SkeletonRows({ rows, visibility }: { rows: number; visibility?: Visibility }) {
  return (
    <ul className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} data-part="skeleton-row" className="flex flex-col gap-1.5 border-l-2 border-transparent py-2 pl-3 pr-2">
          {visibility ? <VisibilityMark visibility={visibility} /> : null}
          <span className="text-body">{BLANK_LINE}</span>
        </li>
      ))}
    </ul>
  )
}

export function ThreadListSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">Loading threads…</p>
      <div aria-hidden="true" data-part="thread-list-skeleton" className="flex flex-col gap-8">
        {LINK_PANES.map(({ title, rows }) => <Pane key={title} title={title}><SkeletonRows rows={rows} /></Pane>)}
        <div className="flex flex-col gap-3">
          <VisibilityLegend />
          <div className="flex flex-col gap-8">
            {THREAD_PANES.map(({ visibility, title, rows }) => <Pane key={title} title={title}><SkeletonRows rows={rows} visibility={visibility} /></Pane>)}
          </div>
        </div>
      </div>
    </>
  )
}
