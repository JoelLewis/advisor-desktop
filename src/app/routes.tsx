/* eslint-disable react-refresh/only-export-components -- route table module */
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { WorkspaceShell } from '@/workspace/shell/WorkspaceShell'
import { WorkspaceHome } from '@/workspace/shell/WorkspaceHome'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'
import { KitPage } from './pages/KitPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { routerFuture } from './router-flags'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { element: <WorkspaceShell />, children: [{ index: true, element: <WorkspaceHome /> }] },
      { path: 'kit', element: <KitPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes, { future: routerFuture })
