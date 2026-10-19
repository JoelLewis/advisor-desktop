import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import type { Visibility } from '@/kit/visibility/visibility'
import { THREAD_GROUP_TITLE } from '@/workspace/people/visibility-words'
import type { BookMode } from './book-mode'

type SkeletonPane = { title: string; rows: number; visibility?: Visibility }
const DESK_PANES: readonly SkeletonPane[] = [{ title: 'Firm', rows: 2 }, { title: 'Reports', rows: 6 }]
const MODE_PANES: Readonly<Record<BookMode, readonly SkeletonPane[]>> = {
  households: [{ title: 'Your day', rows: 1 }, { title: 'Needs you today', rows: 5 }, { title: 'All households', rows: 13 }],
  conversations: [
    { title: THREAD_GROUP_TITLE.private, rows: 1, visibility: 'private' },
    { title: THREAD_GROUP_TITLE.internal, rows: 3, visibility: 'internal' },
    { title: THREAD_GROUP_TITLE.client, rows: 3, visibility: 'client' },
  ],
}

const BLANK_LINE = ' '

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

/** The Book before it arrives, in the loaded column's order: the switch's height, then the same panes and row heights. */
export function ThreadListSkeleton({ mode }: { mode: BookMode }) {
  return (
    <>
      <p role="status" className="sr-only">Loading threads…</p>
      <div aria-hidden="true" data-part="thread-list-skeleton" className="flex flex-col gap-8">
        <div data-part="skeleton-switch" className="min-h-9 border border-transparent coarse:min-h-11" />
        {[...MODE_PANES[mode], ...DESK_PANES].map(({ title, rows, visibility }) => <Pane key={title} title={title}><SkeletonRows rows={rows} visibility={visibility} /></Pane>)}
      </div>
    </>
  )
}
