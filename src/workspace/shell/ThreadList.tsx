import { useId } from 'react'
import { NavLink } from 'react-router-dom'
import { FIRM_NAME } from '@/lib/firm'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import { ConversationsSkeleton } from '@/workspace/shell/ThreadListSkeleton'
import { useDirectory, useThreads } from '@/hooks/use-workspace'
import { threadTitleFor } from '@/workspace/people/roster'
import { THREAD_GROUP_TITLE, bandWordsOf } from '@/workspace/people/visibility-words'
import type { ListedThread, Visibility } from '@/types/workspace'

const GROUPS: readonly { visibility: Visibility; title: string }[] =
  (['private', 'internal', 'client'] as const).map((visibility) => ({ visibility, title: THREAD_GROUP_TITLE[visibility] }))

/** The conversations, for a viewer already known to be the firm or an outsider (the Book decides). */
export function ThreadList({ external }: { external: boolean }) {
  const threads = useThreads()
  const directory = useDirectory()
  if (threads.isPending || directory.isPending) return <ConversationsSkeleton external={external} />
  if (threads.isError) return <p role="alert" className="text-body">{threads.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map(({ visibility, title }) => {
        const group = threads.data.filter((t) => t.visibility === visibility)
        // An outsider sees only their own conversation, under the firm they deal with.
        return group.length > 0
          ? <ThreadGroup key={visibility} title={external && visibility === 'client' ? FIRM_NAME : title} threads={group} viewerIsExternal={external} />
          : null
      })}
    </div>
  )
}

function ThreadGroup({ title, threads, viewerIsExternal }: { title: string; threads: ListedThread[]; viewerIsExternal: boolean }) {
  return (
    <Pane title={title}>
      <ul className="flex flex-col">
        {threads.map((t) => <ThreadRow key={t.id} thread={t} viewerIsExternal={viewerIsExternal} />)}
      </ul>
    </Pane>
  )
}

function ThreadRow({ thread: t, viewerIsExternal }: { thread: ListedThread; viewerIsExternal: boolean }) {
  const noteId = useId()
  return (
    <li>
      <NavLink to={`/t/${t.id}`} aria-describedby={noteId} className={({ isActive }) => cn(
        'flex flex-col gap-1.5 border-l-2 py-2 pl-3 pr-2 hover:bg-face',
        isActive ? 'border-ink bg-face' : 'border-transparent',
      )}>
        {({ isActive }) => (
          <>
            <VisibilityMark visibility={t.visibility} />
            <span className={cn('text-body', isActive && 'font-semibold')}>{threadTitleFor(t, viewerIsExternal)}</span>
          </>
        )}
      </NavLink>
      <span id={noteId} className="sr-only">{`Visibility: ${bandWordsOf(t.audience, viewerIsExternal)}`}</span>
    </li>
  )
}
