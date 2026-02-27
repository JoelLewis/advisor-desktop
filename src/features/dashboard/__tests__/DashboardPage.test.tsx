import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { DashboardPage } from '../DashboardPage'

describe('DashboardPage', () => {
  it('renders greeting with "Sarah"', () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] })
    expect(screen.getByText(/Sarah/)).toBeInTheDocument()
  })

  it('renders a dynamic date text', () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] })
    // Date is now dynamic — just verify some date-like text exists after the greeting
    expect(
      screen.getByText(/\d{4}/),
    ).toBeInTheDocument()
  })

  it('loads MetricsBar content from MSW', async () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] })
    // MetricsBar renders "Total AUM" label once data loads
    expect(await screen.findByText('Total AUM')).toBeInTheDocument()
  })

  it('renders NBA items after data loads', async () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] })
    // NBAQuickView renders "Next Best Actions" header immediately
    expect(await screen.findByText('Next Best Actions')).toBeInTheDocument()
  })

  it('renders the Schedule panel section', async () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] })
    expect(await screen.findByText('Schedule')).toBeInTheDocument()
  })
})
