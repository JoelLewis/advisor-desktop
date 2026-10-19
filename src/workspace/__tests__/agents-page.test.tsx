import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

describe('the Agents page', () => {
  it('lists every agent with what it can and cannot do', async () => {
    renderRoutes(routes, '/agents')
    expect(await screen.findByRole('heading', { level: 1, name: 'Agents' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Agents' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(9)
    expect(list).toHaveTextContent("Drift Monitor")
    expect(list).toHaveTextContent('place or approve trades')
  })
  it('is reached from Firm, and the everyday column no longer lists the agents', async () => {
    renderRoutes(routes, '/')
    const book = await screen.findByRole('navigation', { name: 'Book' })
    expect(within(book).getByRole('link', { name: 'Agents' })).toHaveAttribute('href', '/agents')
    expect(within(book).queryByRole('heading', { name: 'Agents' })).toBeNull()
  })
  it('is not found for an outsider', async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/agents')
    expect(await screen.findByRole('heading', { level: 1, name: 'Agents not found' })).toBeInTheDocument()
  })
})
