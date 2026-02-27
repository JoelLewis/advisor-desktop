import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { useUIStore } from '@/store/ui-store'
import { Sidebar } from '../Sidebar'

beforeEach(() => {
  useUIStore.setState({ sidebarExpanded: true })
})

describe('Sidebar', () => {
  it('renders all nav items as links', () => {
    renderWithProviders(<Sidebar />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(9)
  })

  it('renders nav labels when expanded', () => {
    renderWithProviders(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('Portfolios')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Households')).toBeInTheDocument()
    expect(screen.getByText('Growth')).toBeInTheDocument()
    expect(screen.getByText('Engage')).toBeInTheDocument()
    expect(screen.getByText('Workflows')).toBeInTheDocument()
  })

  it('collapse toggle has aria-label "Collapse sidebar" when expanded', () => {
    renderWithProviders(<Sidebar />)
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
  })

  it('collapse toggle has aria-label "Expand sidebar" when collapsed', () => {
    useUIStore.setState({ sidebarExpanded: false })
    renderWithProviders(<Sidebar />)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('does not render label text when collapsed', () => {
    useUIStore.setState({ sidebarExpanded: false })
    renderWithProviders(<Sidebar />)
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Clients')).not.toBeInTheDocument()
    expect(screen.queryByText('Portfolios')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('highlights the active route link', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/clients'] })
    const clientsLink = screen.getByRole('link', { name: /Clients/ })
    expect(clientsLink.className).toContain('bg-accent-blue')
    expect(clientsLink.className).toContain('font-semibold')
  })

  it('renders the iD logo text regardless of expanded state', () => {
    renderWithProviders(<Sidebar />)
    expect(screen.getByText('iD')).toBeInTheDocument()
  })

  it('renders the iD logo text when collapsed', () => {
    useUIStore.setState({ sidebarExpanded: false })
    renderWithProviders(<Sidebar />)
    expect(screen.getByText('iD')).toBeInTheDocument()
  })

  it('clicking collapse toggle changes sidebar state', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Sidebar />)

    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' })
    await user.click(toggle)

    expect(useUIStore.getState().sidebarExpanded).toBe(false)
  })
})
