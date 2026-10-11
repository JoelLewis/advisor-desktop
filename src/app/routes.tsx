/* eslint-disable react-refresh/only-export-components -- route table module */
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { WorkspaceShell } from '@/workspace/shell/WorkspaceShell'
import { WorkspaceHome } from '@/workspace/shell/WorkspaceHome'
import { ThreadPage } from '@/workspace/thread/ThreadPage'
import { ContextColumn } from '@/workspace/context/ContextColumn'
import type { ShellHandle } from '@/workspace/shell/context-column'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'
import { KitPage } from './pages/KitPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { routerFuture } from './router-flags'

const threadHandle: ShellHandle = { contextColumn: { label: 'Thread context', Content: ContextColumn } }

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
        ],
      },
      { path: 'kit', element: <KitPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes, { future: routerFuture })
