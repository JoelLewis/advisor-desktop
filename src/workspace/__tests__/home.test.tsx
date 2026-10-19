import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approvedV1 } from '@/mocks/workspace/__tests__/story-fixture'

const path = () => screen.findByRole('list', { name: 'The five-minute path' })

describe('home', () => {
  it('says what this is, keeps the notice, and lists the eight steps, the Brief next', async () => {
    renderRoutes(routes, '/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByText(/^One advisor's day at Larkfield Advisory/)).toBeInTheDocument()
    expect(screen.getByText(/everyone in it are fictional/)).toBeInTheDocument()
    const steps = within(await path()).getAllByRole('listitem')
    expect(steps).toHaveLength(8)
    expect(within(steps[0]!).getByRole('link', { name: 'Open the Johnson household' })).toHaveAttribute('href', '/households/hh-001')
    await waitFor(() => expect(steps[0]).toHaveTextContent('NEXT'))
    expect(steps[0]).toHaveAttribute('aria-current', 'step')
    expect(steps.filter((s) => s.hasAttribute('aria-current'))).toHaveLength(1)
    expect(within(steps[2]!).getByRole('link', { name: 'Release the orders' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(screen.queryByText('DONE')).toBeNull()
  })

  it('the date line stays true after the clock moves, and every step says why before what to click', async () => {
    renderRoutes(routes, '/')
    expect(await screen.findByText(/Starts at 25 Feb 2026; the presenter can move the clock forward\./)).toBeInTheDocument()
    expect(screen.queryByText(/frozen/)).not.toBeInTheDocument()
    const steps = await path()
    expect(steps).not.toHaveTextContent(/\bv3\b|exclude QAI|Take /)
    expect(steps).toHaveTextContent('Demo ·')
  })

  it('marks what the session has done and the next step', async () => {
    approvedV1()
    renderRoutes(routes, '/')
    const steps = within(await path()).getAllByRole('listitem')
    await waitFor(() => expect(steps[2]).toHaveTextContent('NEXT'))
    expect(steps[2]).toHaveAttribute('aria-current', 'step')
    expect(steps[0]).not.toHaveAttribute('aria-current')
    expect(steps[0]).toHaveTextContent('DONE')
    expect(steps[1]).toHaveTextContent('DONE')
  })

  it('gives an outsider no firm steps', async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/')
    await screen.findByRole('heading', { level: 1, name: 'Workspace' })
    await waitFor(() => expect(screen.queryByRole('list', { name: 'The five-minute path' })).toBeNull())
  })
})
