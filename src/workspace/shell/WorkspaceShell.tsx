import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useMatches } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/kit/button/Button'
import { SidePanel } from '@/kit/layout/Grid'
import { KeyLegend } from '@/kit/keyboard/KeyLegend'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import type { Binding } from '@/kit/keyboard/keys'
import { MAIN_ID } from '@/kit/page/ids'
import { contextColumnOf, threadListHidden } from './context-column'
import { ContextAvailability } from './ContextAvailability'
import { defaultPhonePane, PHONE_PANE_WORDS, phonePanes, type PhonePane } from './phone-panes'
import { CONTEXT_COLUMN_ID, THREAD_LIST_ID } from './shell-ids'
import { ThemeToggle } from './ThemeToggle'
import { ThreadList } from './ThreadList'
import { ViewAs } from './ViewAs'
import { useFocusOnRouteChange } from './use-focus-on-route-change'

const PANE_REGION_ID: Readonly<Record<PhonePane, string>> = { threads: THREAD_LIST_ID, thread: MAIN_ID, context: CONTEXT_COLUMN_ID }

export function WorkspaceShell() {
  const matches = useMatches()
  const provided = contextColumnOf(matches)
  const listHidden = threadListHidden(matches)
  const [available, setAvailable] = useState(true)
  const context = provided && available ? provided.column : undefined
  const { pathname } = useLocation()
  const panes = phonePanes({ listHidden, hasContext: context !== undefined })
  // A pane chosen on a phone holds for its path; a new path opens on that path's default pane.
  const [chosen, setChosen] = useState<{ path: string; pane: PhonePane }>()
  const wanted = chosen?.path === pathname ? chosen.pane : defaultPhonePane(pathname, listHidden)
  const pane = panes.includes(wanted) ? wanted : 'thread'
  const hiddenOnPhone = (p: PhonePane) => (pane === p ? '' : 'max-narrow:hidden')
  const choose = (p: PhonePane) => () => setChosen({ path: pathname, pane: p })
  // After the chosen pane renders (a hidden one cannot take focus), focus moves into it.
  useEffect(() => {
    if (chosen) document.getElementById(PANE_REGION_ID[chosen.pane])?.focus()
  }, [chosen])
  useJumpKeys('shell', [
    ...(listHidden ? [] : [{ key: '[', label: 'Thread list', run: choose('threads') } satisfies Binding]),
    { key: '\\', label: 'Main', run: choose('thread') },
    ...(context ? [{ key: ']', label: 'Context column', run: choose('context') } satisfies Binding] : []),
  ])
  useFocusOnRouteChange()
  return (
    <div className="flex-1 bg-bg text-ink">
      {provided ? <ContextAvailability key={provided.routeId} useAvailable={provided.column.useAvailable} onChange={setAvailable} /> : null}
      <a href={`#${MAIN_ID}`} onClick={() => setChosen({ path: pathname, pane: 'thread' })} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-face focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-(--breakpoint-wide) flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ink px-6 py-3">
        <Link to="/" className="text-body font-semibold uppercase stretch-wide">Advisor Desktop</Link>
        <KeyLegend className="order-last w-full gap-x-3 split:order-none split:w-auto touch:hidden" />
        <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-4">
          <ViewAs />
          <ThemeToggle />
        </div>
      </header>
      {panes.length > 1 ? (
        <nav aria-label="Panes" className="sticky top-0 z-10 flex border-b border-ink bg-bg px-6 narrow:hidden">
          {panes.map((p) => (
            <Button key={p} rank="quiet" aria-current={p === pane ? 'true' : undefined} onClick={choose(p)}
              className={cn('min-h-11 flex-1 justify-center no-underline', p === pane && 'font-semibold underline decoration-ink')}>
              {PHONE_PANE_WORDS[p]}
            </Button>
          ))}
        </nav>
      ) : null}
      <div className="mx-auto grid max-w-(--breakpoint-wide) grid-cols-12 gap-x-6 gap-y-10 px-6 py-8">
        {listHidden ? null : (
          <nav id={THREAD_LIST_ID} tabIndex={-1} aria-label="Threads" className={cn(hiddenOnPhone('threads'), 'col-span-12 min-w-0 narrow:col-span-4 narrow:row-span-2 split:col-span-3 split:row-span-1')}>
            <ThreadList />
          </nav>
        )}
        <main id={MAIN_ID} tabIndex={-1} className={cn(
          hiddenOnPhone('thread'), 'col-span-12 min-w-0',
          listHidden ? (context ? 'split:col-span-9' : '') : cn('narrow:col-span-8', context ? 'split:col-span-6' : 'split:col-span-9'),
        )}>
          <Outlet />
        </main>
        {context ? (
          <div id={CONTEXT_COLUMN_ID} tabIndex={-1} className={cn(
            hiddenOnPhone('context'), 'col-span-12 min-w-0',
            listHidden ? 'split:col-span-3' : 'narrow:col-span-8 narrow:col-start-5 split:col-span-3 split:col-start-auto',
          )}>
            <SidePanel label={context.label}><context.Content /></SidePanel>
          </div>
        ) : null}
      </div>
    </div>
  )
}
