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
import { MeetingThreadColumn } from '@/workspace/meeting/MeetingThreadColumn'
import { useMeetingThreadAvailable } from '@/workspace/meeting/use-meeting-thread-available'
import type { ShellHandle } from '@/workspace/shell/context-column'
import { RootLayout } from './RootLayout'
import { PageLoading } from './PageLoading'
import { RouteError } from './RouteError'
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
          { path: 'archive', lazy: () => import('@/workspace/archive/ArchivePage').then((m) => ({ Component: m.ArchivePage })), HydrateFallback: PageLoading },
          { path: 'billing', lazy: () => import('@/workspace/reference/BillingPage').then((m) => ({ Component: m.BillingPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'risk', lazy: () => import('@/workspace/reference/BookRiskPage').then((m) => ({ Component: m.BookRiskPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'accounts/:accountId/risk', lazy: () => import('@/workspace/reference/AccountRiskPage').then((m) => ({ Component: m.AccountRiskPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'accounts/:accountId/attribution', lazy: () => import('@/workspace/reference/AttributionPage').then((m) => ({ Component: m.AttributionPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'models', lazy: () => import('@/workspace/reference/ModelsPage').then((m) => ({ Component: m.ModelsPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'models/:modelId', lazy: () => import('@/workspace/reference/ModelPage').then((m) => ({ Component: m.ModelPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'blotter', lazy: () => import('@/workspace/reference/BlotterPage').then((m) => ({ Component: m.BlotterPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'practice', lazy: () => import('@/workspace/reference/PracticePage').then((m) => ({ Component: m.PracticePage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'reconciliation', lazy: () => import('@/workspace/reference/ReconciliationPage').then((m) => ({ Component: m.ReconciliationPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'supervision', lazy: () => import('@/workspace/supervision/SupervisionPage').then((m) => ({ Component: m.SupervisionPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'supervision/:kind/:id', lazy: () => import('@/workspace/supervision/SupervisionPage').then((m) => ({ Component: m.SupervisionPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
          { path: 'proposals/:proposalId', element: <WorkbenchPage />, handle: workbenchHandle },
          { path: 'meetings/:eventId', element: <MeetingPage />, handle: meetingHandle },
          { path: 'prospects/:prospectId', lazy: () => import('@/workspace/prospect/ProspectPage').then((m) => ({ Component: m.ProspectPage })), HydrateFallback: PageLoading, handle: fullWidthHandle },
        ],
      },
      { path: 'kit', lazy: () => import('./pages/KitPage').then((m) => ({ Component: m.KitPage })), HydrateFallback: PageLoading },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes, { future: routerFuture })
