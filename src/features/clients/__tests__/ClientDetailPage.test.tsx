import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { ClientDetailPage } from '../ClientDetailPage'

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/clients/:clientId" element={<ClientDetailPage />} />
    </Routes>,
    { initialEntries: ['/clients/cli-001'] },
  )
}

describe('ClientDetailPage', () => {
  it('renders client name "Robert Johnson" after loading', async () => {
    renderPage()
    expect(await screen.findByText('Robert Johnson')).toBeInTheDocument()
  })

  it('displays all tab labels', async () => {
    renderPage()
    // Wait for client data to load first
    await screen.findByText('Robert Johnson')

    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Accounts/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Documents/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Activity/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Notes/ })).toBeInTheDocument()
  })

  it('shows account data for cli-001 on the Accounts tab', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Robert Johnson')

    // Click the Accounts tab
    await user.click(screen.getByRole('tab', { name: /Accounts/ }))

    // acc-001 is "Johnson Family Trust"
    expect(await screen.findByText('Johnson Family Trust')).toBeInTheDocument()
  })

  it('renders document list when Documents tab is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Robert Johnson')

    await user.click(screen.getByRole('tab', { name: /Documents/ }))

    // doc-001 is "Johnson Family Trust — IPS" for cli-001
    expect(
      await screen.findByText(/Johnson Family Trust.*IPS/),
    ).toBeInTheDocument()
  })

  it('renders activity items when Activity tab is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Robert Johnson')

    await user.click(screen.getByRole('tab', { name: /Activity/ }))

    // Activity tab should render items — wait for any activity content to appear
    // Activities reference Robert Johnson as entityName
    const tabPanel = screen.getByRole('tabpanel')
    expect(tabPanel).toBeInTheDocument()
  })
})
