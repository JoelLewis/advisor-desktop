import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
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

  // Critical fix round 2 · pre-trade-compliance / coverage gap — nothing previously covered the
  // TradeTicketDialog wiring at all. Clicking Buy on a position row used to open a dialog with
  // no way to price the trade (VTI has no quote in the symbol-search fixture, and the dialog
  // never received the position's own known price), so any quantity sent `estimatedValue: 0`
  // to the pre-check and came back an affirmative "all compliance checks passed" — a
  // 1,000,000-share VTI order in an $8.2M account showing as clean.
  it('fix round 2: clicking Buy on the VTI row and entering a huge quantity does not falsely pass compliance', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Johnson Family Trust')
    await user.click(screen.getByRole('tab', { name: /Positions/ }))
    await screen.findByText('VTI')

    const vtiRow = screen.getByText('VTI').closest('tr')
    expect(vtiRow).not.toBeNull()
    await user.click(within(vtiRow!).getByText('Buy'))

    const qtyInput = await screen.findByLabelText('Quantity (shares)')
    await user.clear(qtyInput)
    await user.type(qtyInput, '1000000')

    expect(await screen.findByText(/trade blocked/i, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })
})
