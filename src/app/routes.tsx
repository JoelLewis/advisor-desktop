/* eslint-disable react-refresh/only-export-components -- route table module */
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { WorkspaceShell } from '@/workspace/shell/WorkspaceShell'
import { WorkspaceHome } from '@/workspace/shell/WorkspaceHome'
import { AccountView } from '@/workspace/full-views/AccountView'
import { HouseholdView } from '@/workspace/full-views/HouseholdView'
import { ClientView } from '@/workspace/full-views/ClientView'
import { ThreadPage } from '@/workspace/thread/ThreadPage'
import { ContextColumn } from '@/workspace/context/ContextColumn'
import { useThreadContextAvailable } from '@/workspace/context/use-thread-context-available'
import { WorkbenchPage } from '@/workspace/workbench/WorkbenchPage'
import { WorkbenchThreadColumn } from '@/workspace/workbench/WorkbenchThreadColumn'
import { useWorkbenchThreadAvailable } from '@/workspace/workbench/use-workbench-thread-available'
import { MeetingPage } from '@/workspace/meeting/MeetingPage'
import { ProspectPage } from '@/workspace/prospect/ProspectPage'
import { MeetingThreadColumn } from '@/workspace/meeting/MeetingThreadColumn'
import { useMeetingThreadAvailable } from '@/workspace/meeting/use-meeting-thread-available'
import { ArchivePage } from '@/workspace/archive/ArchivePage'
import { BillingPage } from '@/workspace/reference/BillingPage'
import { ReconciliationPage } from '@/workspace/reference/ReconciliationPage'
import { PracticePage } from '@/workspace/reference/PracticePage'
import { SupervisionPage } from '@/workspace/supervision/SupervisionPage'
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
const meetingHandle: ShellHandle = {
  contextColumn: { label: 'Live thread', Content: MeetingThreadColumn, useAvailable: useMeetingThreadAvailable },
  threadList: 'hidden',
}
const fullWidthHandle: ShellHandle = { threadList: 'hidden' }

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
          { path: 'households/:householdId', element: <HouseholdView />, handle: fullWidthHandle },
          { path: 'clients/:clientId', element: <ClientView />, handle: fullWidthHandle },
          { path: 'archive', element: <ArchivePage /> },
          { path: 'billing', element: <BillingPage />, handle: fullWidthHandle },
          { path: 'practice', element: <PracticePage />, handle: fullWidthHandle },
          { path: 'reconciliation', element: <ReconciliationPage />, handle: fullWidthHandle },
          { path: 'supervision', element: <SupervisionPage />, handle: fullWidthHandle },
          { path: 'supervision/:kind/:id', element: <SupervisionPage />, handle: fullWidthHandle },
          { path: 'proposals/:proposalId', element: <WorkbenchPage />, handle: workbenchHandle },
          { path: 'meetings/:eventId', element: <MeetingPage />, handle: meetingHandle },
          { path: 'prospects/:prospectId', element: <ProspectPage />, handle: fullWidthHandle },
        ],
      },
      { path: 'kit', element: <KitPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes, { future: routerFuture })
