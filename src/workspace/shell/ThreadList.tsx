import { useId } from 'react'
import { NavLink } from 'react-router-dom'
import { FIRM_NAME } from '@/lib/firm'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import { ThreadListSkeleton } from '@/workspace/shell/ThreadListSkeleton'
import { useDirectory, useThreads } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { threadTitleFor } from '@/workspace/people/roster'
import { THREAD_GROUP_TITLE, bandWordsOf } from '@/workspace/people/visibility-words'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { AgentScope } from '@/workspace/people/AgentScope'
import type { AgentProfile, ListedThread, Thread, Visibility } from '@/types/workspace'

const GROUPS: readonly { visibility: Visibility; title: string }[] =
  (['private', 'internal', 'client'] as const).map((visibility) => ({ visibility, title: THREAD_GROUP_TITLE[visibility] }))

export function ThreadList() {
  const threads = useThreads()
  const { viewerId } = useViewer()
  const directory = useDirectory()
  // Whether the viewer is an outsider decides the rows' words and the panes, so the list waits for the directory too.
  if (threads.isPending || directory.isPending) return <ThreadListSkeleton />
  if (threads.isError) return <p role="alert" className="text-body">{threads.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const external = isExternalViewerIn(directory.data, viewerId)
  return (
    <div className="flex flex-col gap-8">
      {external ? null : <DeskLinks />}
      {GROUPS.map(({ visibility, title }) => {
        const group = threads.data.filter((t) => t.visibility === visibility)
        // An outsider sees only their own conversation, under the firm they deal with.
        return group.length > 0
          ? <ThreadGroup key={visibility} title={external && visibility === 'client' ? FIRM_NAME : title} threads={group} viewerIsExternal={external} />
          : null
      })}
      <DeskAgents threads={threads.data} agents={directory.data.agents} />
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

function DeskAgents({ threads, agents: everyAgent }: { threads: Thread[]; agents: AgentProfile[] }) {
  const onDesk = new Set(threads.flatMap((t) => t.agentIds))
  const agents = everyAgent.filter((a) => onDesk.has(a.id))
  if (agents.length === 0) return null
  return (
    <Pane title="Agents on this desk">
      <ul className="flex flex-col gap-4">
        {agents.map((a) => <li key={a.id}><AgentScope agent={a} /></li>)}
      </ul>
    </Pane>
  )
}

/** Firm surfaces that are not threads. A client is never offered them. */
const DESK: readonly { to: string; label: string }[] = [{ to: '/supervision', label: 'Supervision' }, { to: '/archive', label: 'Archive' }]

/** The firm's reference views, one step from every thread. */
const REFERENCE: readonly { to: string; label: string }[] = [
  { to: '/billing', label: 'Billing' }, { to: '/reconciliation', label: 'Reconciliation' }, { to: '/risk', label: 'Risk' },
  { to: '/models', label: 'Models' }, { to: '/practice', label: 'Practice' }, { to: '/blotter', label: 'Blotter' },
]

function DeskLinks() {
  return (
    <>
      <LinkPane title="Desk" links={DESK} />
      <LinkPane title="Reference" links={REFERENCE} />
    </>
  )
}

function LinkPane({ title, links }: { title: string; links: readonly { to: string; label: string }[] }) {
  return (
    <Pane title={title}>
      <ul className="flex flex-col">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => cn('flex border-l-2 py-2 pl-3 pr-2 text-body hover:bg-face', isActive ? 'border-ink bg-face font-semibold' : 'border-transparent')}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </Pane>
  )
}
