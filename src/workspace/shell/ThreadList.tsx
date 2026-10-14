import { useId } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import { visibilityWords } from '@/kit/visibility/visibility'
import { VisibilityLegend } from '@/workspace/shell/VisibilityLegend'
import { useDirectory, useThreads } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { threadParty } from '@/workspace/people/thread-party'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { AgentScope } from '@/workspace/people/AgentScope'
import type { Thread, Visibility } from '@/types/workspace'

const GROUPS: readonly { visibility: Visibility; title: string }[] = [
  { visibility: 'private', title: 'Private' },
  { visibility: 'internal', title: 'Internal' },
  { visibility: 'client', title: 'Clients and prospects' },
]

/** An outsider sees only their own conversation with the firm, titled as theirs. */
const EXTERNAL_GROUP_TITLE = 'Your conversation'

export function ThreadList() {
  const threads = useThreads()
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const external = directory.data !== undefined && isExternalViewerIn(directory.data, viewerId)
  if (threads.isPending) return <p role="status" className="text-body text-ink-3">Loading threads…</p>
  if (threads.isError) return <p role="alert" className="text-body">{threads.error.message}</p>
  return (
    <div className="flex flex-col gap-8">
      <DeskLinks />
      <div className="flex flex-col gap-3">
        {external ? null : <VisibilityLegend />}
        <div className="flex flex-col gap-8">
          {GROUPS.map(({ visibility, title }) => {
            const group = threads.data.filter((t) => t.visibility === visibility)
            return group.length > 0 ? <ThreadGroup key={visibility} title={external && visibility === 'client' ? EXTERNAL_GROUP_TITLE : title} threads={group} /> : null
          })}
        </div>
      </div>
      <DeskAgents threads={threads.data} />
    </div>
  )
}

function ThreadGroup({ title, threads }: { title: string; threads: Thread[] }) {
  return (
    <Pane title={title}>
      <ul className="flex flex-col">
        {threads.map((t) => <ThreadRow key={t.id} thread={t} />)}
      </ul>
    </Pane>
  )
}

function ThreadRow({ thread: t }: { thread: Thread }) {
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
      <span id={noteId} className="sr-only">{`Visibility: ${visibilityWords(t.visibility, threadParty(t))}`}</span>
    </li>
  )
}

function DeskAgents({ threads }: { threads: Thread[] }) {
  const directory = useDirectory()
  if (directory.isPending) return <p role="status" className="text-body text-ink-3">Loading agents…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const onDesk = new Set(threads.flatMap((t) => t.agentIds))
  const agents = directory.data.agents.filter((a) => onDesk.has(a.id))
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
  const { viewerId } = useViewer()
  const directory = useDirectory()
  if (!directory.data || isExternalViewerIn(directory.data, viewerId)) return null
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
