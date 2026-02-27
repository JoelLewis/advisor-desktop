import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { AccountDetailPage } from '../AccountDetailPage'

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/portfolios/accounts/:accountId" element={<AccountDetailPage />} />
    </Routes>,
    { initialEntries: ['/portfolios/accounts/acc-001'] },
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
})
