import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { RouteErrorPage } from '@/components/RouteErrorPage'

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
const ModelGovernancePage = lazy(() => import('@/features/portfolios/ModelGovernancePage').then((m) => ({ default: m.ModelGovernancePage })))
const TradingPage = lazy(() => import('@/features/portfolios/TradingPage').then((m) => ({ default: m.TradingPage })))
const ActionsPage = lazy(() => import('@/features/actions/ActionsPage').then((m) => ({ default: m.ActionsPage })))
const HouseholdListPage = lazy(() => import('@/features/households/HouseholdListPage').then((m) => ({ default: m.HouseholdListPage })))
const EngagePage = lazy(() => import('@/features/engage/EngagePage').then((m) => ({ default: m.EngagePage })))

const suspense = (node: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{node}</Suspense>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: suspense(<DashboardPage />), handle: { breadcrumb: 'Dashboard' } },
      { path: 'actions', element: suspense(<ActionsPage />), handle: { breadcrumb: 'Actions' } },
      {
        path: 'clients',
        handle: { breadcrumb: 'Clients' },
        children: [
          { index: true, element: suspense(<ClientListPage />) },
          { path: ':clientId', element: suspense(<ClientDetailPage />), handle: { breadcrumb: 'Client' } },
          { path: 'onboard/:prospectId?', element: suspense(<OnboardingWizard />), handle: { breadcrumb: 'Onboarding' } },
        ],
      },
      {
        path: 'households',
        handle: { breadcrumb: 'Households' },
        children: [
          { index: true, element: suspense(<HouseholdListPage />) },
          { path: ':householdId', element: suspense(<HouseholdDetailPage />), handle: { breadcrumb: 'Household' } },
        ],
      },
      {
        path: 'portfolios',
        handle: { breadcrumb: 'Portfolios' },
        children: [
          { index: true, element: suspense(<PortfolioPage />) },
          { path: 'accounts/:accountId', element: suspense(<AccountDetailPage />), handle: { breadcrumb: 'Account' } },
          { path: 'accounts/:accountId/attribution', element: suspense(<AttributionPage />), handle: { breadcrumb: 'Attribution' } },
          { path: 'accounts/:accountId/tax', element: suspense(<TaxManagementPage />), handle: { breadcrumb: 'Tax Management' } },
          { path: 'rebalance', element: suspense(<RebalancePage />), handle: { breadcrumb: 'Rebalance' } },
          { path: 'risk', element: suspense(<RiskAnalyticsPage />), handle: { breadcrumb: 'Risk Analytics' } },
          { path: 'models', element: suspense(<ModelGovernancePage />), handle: { breadcrumb: 'Model Governance' } },
          { path: 'trading', element: suspense(<TradingPage />), handle: { breadcrumb: 'Trading' } },
        ],
      },
      {
        path: 'growth',
        handle: { breadcrumb: 'Growth' },
        children: [
          { index: true, element: suspense(<ProspectsPage />) },
          { path: 'revenue', element: suspense(<RevenuePage />), handle: { breadcrumb: 'Revenue' } },
        ],
      },
      { path: 'engage', element: suspense(<EngagePage />), handle: { breadcrumb: 'Engage' } },
      { path: 'workflows', element: suspense(<WorkflowCenterPage />), handle: { breadcrumb: 'Workflows' } },
      { path: 'settings', element: suspense(<SettingsPage />), handle: { breadcrumb: 'Settings' } },
    ],
  },
])
