import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { ClientListPage } from '../ClientListPage'

describe('ClientListPage', () => {
  it('renders "Clients" heading', () => {
    renderWithProviders(<ClientListPage />, { initialEntries: ['/clients'] })
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  it('shows total client count after loading', async () => {
    renderWithProviders(<ClientListPage />, { initialEntries: ['/clients'] })
    // MSW returns 22 clients; the count badge renders data.total
    expect(await screen.findByText('22')).toBeInTheDocument()
  })

  it('renders search input with correct placeholder', () => {
    renderWithProviders(<ClientListPage />, { initialEntries: ['/clients'] })
    expect(
      screen.getByPlaceholderText('Search by name or email...'),
    ).toBeInTheDocument()
  })

  it('renders client names after data loads', async () => {
    renderWithProviders(<ClientListPage />, { initialEntries: ['/clients'] })
    expect(await screen.findByText('Robert Johnson')).toBeInTheDocument()
  })
})
