import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// Lazy-loaded feature pages
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ClientListPage = lazy(() => import('@/features/clients/ClientListPage').then((m) => ({ default: m.ClientListPage })))
const ClientDetailPage = lazy(() => import('@/features/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })))
const HouseholdDetailPage = lazy(() => import('@/features/clients/HouseholdDetailPage').then((m) => ({ default: m.HouseholdDetailPage })))
const PortfolioPage = lazy(() => import('@/features/portfolios/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
const AccountDetailPage = lazy(() => import('@/features/portfolios/AccountDetailPage').then((m) => ({ default: m.AccountDetailPage })))
const RebalancePage = lazy(() => import('@/features/portfolios/RebalancePage').then((m) => ({ default: m.RebalancePage })))
const AttributionPage = lazy(() => import('@/features/portfolios/AttributionPage').then((m) => ({ default: m.AttributionPage })))
const RiskAnalyticsPage = lazy(() => import('@/features/portfolios/RiskAnalyticsPage').then((m) => ({ default: m.RiskAnalyticsPage })))
const TaxManagementPage = lazy(() => import('@/features/portfolios/TaxManagementPage').then((m) => ({ default: m.TaxManagementPage })))
const ProspectsPage = lazy(() => import('@/features/growth/ProspectsPage').then((m) => ({ default: m.ProspectsPage })))
const RevenuePage = lazy(() => import('@/features/growth/RevenuePage').then((m) => ({ default: m.RevenuePage })))
const WorkflowCenterPage = lazy(() => import('@/features/workflows/WorkflowCenterPage').then((m) => ({ default: m.WorkflowCenterPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })))
const NBAEffectivenessPage = lazy(() => import('@/features/dashboard/NBAEffectivenessPage').then((m) => ({ default: m.NBAEffectivenessPage })))
const ModelGovernancePage = lazy(() => import('@/features/portfolios/ModelGovernancePage').then((m) => ({ default: m.ModelGovernancePage })))

const suspense = (node: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{node}</Suspense>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: suspense(<DashboardPage />) },
      { path: 'dashboard/nba-effectiveness', element: suspense(<NBAEffectivenessPage />) },
      {
        path: 'clients',
        children: [
          { index: true, element: suspense(<ClientListPage />) },
          { path: ':clientId', element: suspense(<ClientDetailPage />) },
          { path: 'onboard/:prospectId?', element: suspense(<OnboardingWizard />) },
        ],
      },
      {
        path: 'households/:householdId',
        element: suspense(<HouseholdDetailPage />),
      },
      {
        path: 'portfolios',
        children: [
          { index: true, element: suspense(<PortfolioPage />) },
          { path: 'accounts/:accountId', element: suspense(<AccountDetailPage />) },
          { path: 'accounts/:accountId/attribution', element: suspense(<AttributionPage />) },
          { path: 'accounts/:accountId/tax', element: suspense(<TaxManagementPage />) },
          { path: 'rebalance', element: suspense(<RebalancePage />) },
          { path: 'risk', element: suspense(<RiskAnalyticsPage />) },
          { path: 'models', element: suspense(<ModelGovernancePage />) },
        ],
      },
      {
        path: 'growth',
        children: [
          { index: true, element: suspense(<ProspectsPage />) },
          { path: 'revenue', element: suspense(<RevenuePage />) },
        ],
      },
      { path: 'workflows', element: suspense(<WorkflowCenterPage />) },
      { path: 'settings', element: suspense(<SettingsPage />) },
    ],
  },
])
