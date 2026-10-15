import { useId } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import { ThreadListSkeleton } from '@/workspace/shell/ThreadListSkeleton'
import { useDirectory, useThreads } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { THREAD_GROUP_TITLE, rowWordsOf } from '@/workspace/people/visibility-words'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { AgentScope } from '@/workspace/people/AgentScope'
import type { AgentProfile, Directory, Thread, Visibility } from '@/types/workspace'

const GROUPS: readonly { visibility: Visibility; title: string }[] =
  (['private', 'internal', 'client'] as const).map((visibility) => ({ visibility, title: THREAD_GROUP_TITLE[visibility] }))

/** An outsider sees only their own conversation with the firm, titled as theirs. */
const EXTERNAL_GROUP_TITLE = 'Your conversation'

export function ThreadList() {
  const threads = useThreads()
  const { viewerId } = useViewer()
  const directory = useDirectory()
  // The rows' words name each client thread's party, so the list waits for the directory as well as the threads.
  if (threads.isPending || directory.isPending) return <ThreadListSkeleton />
  if (threads.isError) return <p role="alert" className="text-body">{threads.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const external = isExternalViewerIn(directory.data, viewerId)
  return (
    <div className="flex flex-col gap-8">
      {external ? null : <DeskLinks />}
      {GROUPS.map(({ visibility, title }) => {
        const group = threads.data.filter((t) => t.visibility === visibility)
        return group.length > 0
          ? <ThreadGroup key={visibility} title={external && visibility === 'client' ? EXTERNAL_GROUP_TITLE : title} threads={group} directory={directory.data} viewerIsExternal={external} />
          : null
      })}
      <DeskAgents threads={threads.data} agents={directory.data.agents} />
    </div>
  )
}

type RowContext = { directory: Directory; viewerIsExternal: boolean }

function ThreadGroup({ title, threads, directory, viewerIsExternal }: { title: string; threads: Thread[] } & RowContext) {
  return (
    <Pane title={title}>
      <ul className="flex flex-col">
        {threads.map((t) => <ThreadRow key={t.id} thread={t} directory={directory} viewerIsExternal={viewerIsExternal} />)}
      </ul>
    </Pane>
  )
}

function ThreadRow({ thread: t, directory, viewerIsExternal }: { thread: Thread } & RowContext) {
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
            <span className={cn('text-body', isActive && 'font-semibold')}>{t.title}</span>
          </>
        )}
      </NavLink>
      <span id={noteId} className="sr-only">{`Visibility: ${rowWordsOf(t, directory, viewerIsExternal)}`}</span>
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
