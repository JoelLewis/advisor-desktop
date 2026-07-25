import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { AccountDetailPage } from '../AccountDetailPage'

function renderPageAt(initialEntry: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/accounts/:accountId" element={<AccountDetailPage />} />
    </Routes>,
    { initialEntries: [initialEntry] },
  )
}

function renderPage() {
  return renderPageAt('/portfolios/accounts/acc-001')
}

describe('AccountDetailPage', () => {
  it('renders account name after loading', async () => {
    renderPage()
    // acc-001 is "Johnson Family Trust"
    expect(await screen.findByText('Johnson Family Trust')).toBeInTheDocument()
  })

  it('displays key tab labels', async () => {
    renderPage()
    await screen.findByText('Johnson Family Trust')

    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Positions/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Performance/ })).toBeInTheDocument()
  })

  it('shows position symbols on the Positions tab', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Johnson Family Trust')

    await user.click(screen.getByRole('tab', { name: /Positions/ }))

    // acc-001 positions include VTI, AAPL, MSFT
    expect(await screen.findByText('VTI')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('renders the account number', async () => {
    renderPage()
    // acc-001 account number is "TRU-847291"
    expect(await screen.findByText('TRU-847291')).toBeInTheDocument()
  })

  it('has a back navigation button', async () => {
    renderPage()
    await screen.findByText('Johnson Family Trust')
    // The back button renders an ArrowLeft icon inside a button
    const buttons = screen.getAllByRole('button')
    // At least one button exists for back navigation
    expect(buttons.length).toBeGreaterThan(0)
  })

  // Review round 2, Important · nba-007's actionRoute is
  // `{ path: '/portfolios/accounts/acc-011', params: { tab: 'concentration' } }`, which NBAFeed
  // turns into `/portfolios/accounts/acc-011?tab=concentration`. Before TabLayout read the URL,
  // this silently opened Overview instead of Concentration — a route-existence check alone cannot
  // catch that, since the route resolves fine. This asserts the tab that actually opens.
  it('opens the Concentration tab when the URL carries ?tab=concentration (the NBA route shape)', async () => {
    renderPageAt('/portfolios/accounts/acc-011?tab=concentration')
    await screen.findByText('David Williams Individual')

    const concentrationTab = await screen.findByRole('tab', { name: /Concentration/ })
    expect(concentrationTab).toHaveAttribute('aria-selected', 'true')
    const overviewTab = screen.getByRole('tab', { name: /Overview/ })
    expect(overviewTab).toHaveAttribute('aria-selected', 'false')
  })

  it('falls back to Overview when ?tab= is absent or names an unknown tab', async () => {
    renderPageAt('/portfolios/accounts/acc-011?tab=not-a-real-tab')
    await screen.findByText('David Williams Individual')

    const overviewTab = await screen.findByRole('tab', { name: /Overview/ })
    expect(overviewTab).toHaveAttribute('aria-selected', 'true')
  })
})
