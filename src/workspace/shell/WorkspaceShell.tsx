import { useState } from 'react'
import { Link, Outlet, useMatches } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { SidePanel } from '@/kit/layout/Grid'
import { KeyLegend } from '@/kit/keyboard/KeyLegend'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import type { Binding } from '@/kit/keyboard/keys'
import { MAIN_ID } from '@/kit/page/ids'
import { contextColumnOf } from './context-column'
import { ContextAvailability } from './ContextAvailability'
import { CONTEXT_COLUMN_ID, THREAD_LIST_ID } from './shell-ids'
import { ThemeToggle } from './ThemeToggle'
import { ThreadList } from './ThreadList'
import { ViewAs } from './ViewAs'
import { useFocusOnRouteChange } from './use-focus-on-route-change'

const focusRegion = (id: string) => () => document.getElementById(id)?.focus()

export function WorkspaceShell() {
  const provided = contextColumnOf(useMatches())
  const [available, setAvailable] = useState(true)
  const context = provided && available ? provided.column : undefined
  useJumpKeys('shell', [
    { key: '[', label: 'Thread list', run: focusRegion(THREAD_LIST_ID) },
    { key: '\\', label: 'Main', run: focusRegion(MAIN_ID) },
    ...(context ? [{ key: ']', label: 'Context column', run: focusRegion(CONTEXT_COLUMN_ID) } satisfies Binding] : []),
  ])
  useFocusOnRouteChange()
  return (
    <div className="flex-1 bg-bg text-ink">
      {provided ? <ContextAvailability key={provided.routeId} useAvailable={provided.column.useAvailable} onChange={setAvailable} /> : null}
      <a href={`#${MAIN_ID}`} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-face focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-(--breakpoint-wide) flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ink px-6 py-3">
        <Link to="/" className="text-body font-semibold uppercase stretch-wide">Advisor Desktop</Link>
        <KeyLegend className="order-last w-full gap-x-3 split:order-none split:w-auto" />
        <div className="flex flex-wrap items-center gap-4">
          <ViewAs />
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto grid max-w-(--breakpoint-wide) grid-cols-12 gap-x-6 gap-y-10 px-6 py-8">
        <nav id={THREAD_LIST_ID} tabIndex={-1} aria-label="Threads" className="col-span-12 min-w-0 narrow:col-span-4 narrow:row-span-2 split:col-span-3 split:row-span-1">
          <ThreadList />
        </nav>
        <main id={MAIN_ID} tabIndex={-1} className={cn('col-span-12 min-w-0 narrow:col-span-8', context ? 'split:col-span-6' : 'split:col-span-9')}>
          <Outlet />
        </main>
        {context ? (
          <div id={CONTEXT_COLUMN_ID} tabIndex={-1} className="col-span-12 min-w-0 narrow:col-span-8 narrow:col-start-5 split:col-span-3 split:col-start-auto">
            <SidePanel label={context.label}><context.Content /></SidePanel>
          </div>
        ) : null}
      </div>
    </div>
  )
}
