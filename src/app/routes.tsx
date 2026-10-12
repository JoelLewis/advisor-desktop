/* eslint-disable react-refresh/only-export-components -- route table module */
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { WorkspaceShell } from '@/workspace/shell/WorkspaceShell'
import { WorkspaceHome } from '@/workspace/shell/WorkspaceHome'
import { AccountView } from '@/workspace/full-views/AccountView'
import { ThreadPage } from '@/workspace/thread/ThreadPage'
import { ContextColumn } from '@/workspace/context/ContextColumn'
import { useThreadContextAvailable } from '@/workspace/context/use-thread-context-available'
import { WorkbenchPage } from '@/workspace/workbench/WorkbenchPage'
import { WorkbenchThreadColumn } from '@/workspace/workbench/WorkbenchThreadColumn'
import { useWorkbenchThreadAvailable } from '@/workspace/workbench/use-workbench-thread-available'
import type { ShellHandle } from '@/workspace/shell/context-column'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'
import { KitPage } from './pages/KitPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { routerFuture } from './router-flags'

const threadHandle: ShellHandle = { contextColumn: { label: 'Thread context', Content: ContextColumn, useAvailable: useThreadContextAvailable } }
const workbenchHandle: ShellHandle = {
  contextColumn: { label: 'Live thread', Content: WorkbenchThreadColumn, useAvailable: useWorkbenchThreadAvailable },
  threadList: 'hidden',
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <WorkspaceShell />,
        children: [
          { index: true, element: <WorkspaceHome /> },
          { path: 't/:threadId', element: <ThreadPage />, handle: threadHandle },
          { path: 'accounts/:accountId', element: <AccountView /> },
          { path: 'proposals/:proposalId', element: <WorkbenchPage />, handle: workbenchHandle },
        ],
      },
      { path: 'kit', element: <KitPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes, { future: routerFuture })
