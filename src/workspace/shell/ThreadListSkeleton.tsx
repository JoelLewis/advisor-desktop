import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import type { Visibility } from '@/kit/visibility/visibility'
import { THREAD_GROUP_TITLE } from '@/workspace/people/visibility-words'

type SkeletonPane = { rows: number; title?: string; visibility?: Visibility }
/**
 * Before the viewer is known: one untitled pane of one row, the shape every viewer's column starts with. It carries no
 * firm words and no firm shape, so a client's column never collapses from the firm's book; the firm's grows below it.
 */
const NEUTRAL_PANES: readonly SkeletonPane[] = [{ rows: 1 }]

/** The firm's conversations once the viewer is known to be the firm: the same panes, now titled. */
const FIRM_CONVERSATION_PANES: readonly SkeletonPane[] = [
  { title: THREAD_GROUP_TITLE.private, rows: 1, visibility: 'private' },
  { title: THREAD_GROUP_TITLE.internal, rows: 3, visibility: 'internal' },
  { title: THREAD_GROUP_TITLE.client, rows: 3, visibility: 'client' },
]
const OUTSIDER_CONVERSATION_PANES: readonly SkeletonPane[] = [{ rows: 1, visibility: 'client' }]

const NO_TITLE = '\u00A0'

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

function SkeletonPanes({ panes }: { panes: readonly SkeletonPane[] }) {
  return panes.map(({ title, rows, visibility }, i) => <Pane key={i} title={title ?? NO_TITLE}><SkeletonRows rows={rows} visibility={visibility} /></Pane>)
}

/** The left column before the directory arrives: one neutral pane, with no words, whoever the viewer turns out to be. */
export function ThreadListSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">Loading…</p>
      <div aria-hidden="true" data-part="thread-list-skeleton" className="flex flex-col gap-8">
        <SkeletonPanes panes={NEUTRAL_PANES} />
      </div>
    </>
  )
}

/** The conversations while the threads arrive, once the viewer is known: no switch, no desk links. */
export function ConversationsSkeleton({ external }: { external: boolean }) {
  return (
    <>
      <p role="status" className="sr-only">Loading threads…</p>
      <div aria-hidden="true" data-part="thread-list-skeleton" className="flex flex-col gap-8">
        <SkeletonPanes panes={external ? OUTSIDER_CONVERSATION_PANES : FIRM_CONVERSATION_PANES} />
      </div>
    </>
  )
}
