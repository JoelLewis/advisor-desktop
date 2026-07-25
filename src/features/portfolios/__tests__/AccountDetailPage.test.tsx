import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { AccountDetailPage } from '../AccountDetailPage'

function renderPage(accountId = 'acc-001') {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/accounts/:accountId" element={<AccountDetailPage />} />
    </Routes>,
    { initialEntries: [`/portfolios/accounts/${accountId}`] },
  )
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

  // C24 review fix — the per-asset-class drift highlight used to compare against a hardcoded 2%,
  // independent of the account's own model band, so a class could render red on a card that
  // simultaneously says "acceptable drift levels". acc-011 (mod-002, 5% band) is a real account in
  // the fixture set with two classes over 2% (us_equity +3.0%, fixed_income -2.7%) but under its
  // own 5% band — needsRebalance is false, so neither class should be flagged.
  it("acc-011: an asset-class drift over 2% but within the account's own model band is not flagged red", async () => {
    renderPage('acc-011')
    await screen.findByText('David Williams Individual')

    expect(await screen.findByText(/acceptable drift levels/)).toBeInTheDocument()

    const overweight = screen.getByText('+3.0%')
    expect(overweight.className).not.toMatch(/text-accent-red/)
    expect(overweight.className).toMatch(/text-accent-green/)

    const underweight = screen.getByText('-2.7%')
    expect(underweight.className).not.toMatch(/text-accent-red/)
    expect(underweight.className).toMatch(/text-accent-green/)
  })

  // C24 review fix — Max Drift is now rendered against the account's own band (not the aggregate
  // totalDrift against a mismatched hardcoded 3%), so an in-tolerance account never shows red.
  it('acc-011: Max Drift renders in green, paired with its own band, when drift is acceptable', async () => {
    renderPage('acc-011')
    await screen.findByText('David Williams Individual')

    const maxDrift = await screen.findByText('3.0% / ±5.0%')
    expect(maxDrift.className).toMatch(/text-accent-green/)
  })
})
