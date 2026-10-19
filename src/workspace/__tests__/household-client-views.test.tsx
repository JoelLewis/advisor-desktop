import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { holdMeeting } from '@/services/workspace'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the household full view', () => {
  afterEach(() => sessionStorage.clear())

  it('carries the summary, the meetings, the documents, the communications and the activity', async () => {
    renderRoutes(routes, '/households/hh-001?from=th-johnson-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Johnson Household' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    expect(screen.getByRole('main')).toHaveTextContent("Larkfield team · Robert and Patricia can't see this")
    expect(screen.getByRole('link', { name: 'Patricia Johnson' })).toHaveAttribute('href', '/clients/cli-002?from=th-johnson-meeting')
    expect(screen.getByRole('table', { name: 'Household accounts' })).toHaveTextContent(/ties to the household total, [\d,]+ USD/)
    const upcoming = screen.getByRole('list', { name: 'Upcoming meetings' })
    expect(upcoming).toHaveTextContent('Johnson annual review · 25 Feb 2026 · 14:00–15:15 ET')
    expect(within(upcoming).getByRole('link', { name: /Open the meeting view/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(screen.getByRole('table', { name: 'Documents' })).toHaveTextContent('Johnson Family Trust — IPS')
    expect(screen.getByRole('list', { name: 'Communications' })).toHaveTextContent('Estate Planning Review')
    expect(screen.getByRole('list', { name: 'Activity' })).toHaveTextContent('Trade executed')
  })

  it('lists the annual review under past meetings once it is held', async () => {
    await holdMeeting('user-001', 'evt-010')
    renderRoutes(routes, '/households/hh-001')
    const past = await screen.findByRole('list', { name: 'Past meetings' })
    expect(past).toHaveTextContent('Johnson annual review')
    expect(past).toHaveTextContent('HELD')
  })

  it('is not found for Robert and for an unknown household; a switch to Robert goes home', async () => {
    viewAsOnLoad('cli-001')
    const { unmount } = renderRoutes(routes, '/households/hh-001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Household not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Vanguard')
    unmount()
    sessionStorage.clear()
    const second = renderRoutes(routes, '/households/hh-999')
    expect(await screen.findByRole('heading', { level: 1, name: 'Household not found' })).toBeInTheDocument()
    second.unmount()
    const { router } = renderRoutes(routes, '/households/hh-001')
    await screen.findByRole('heading', { level: 1, name: 'Johnson Household' })
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('the client full view', () => {
  afterEach(() => sessionStorage.clear())

  it("carries Patricia's profile, risk assessment and its date, her accounts, the IPS and her communications", async () => {
    renderRoutes(routes, '/clients/cli-002')
    expect(await screen.findByRole('heading', { level: 1, name: 'Patricia Johnson' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent('11 Jul 1960')
    expect(main).toHaveTextContent('Retired')
    expect(main).toHaveTextContent('Moderate Conservative · score 35 of 100 · assessed 15 Sep 2025')
    expect(screen.getByRole('table', { name: 'Accounts owned' })).toHaveTextContent('Patricia Johnson · Roth IRA (…1028)')
    expect(screen.getByRole('table', { name: 'Accounts owned' })).toHaveTextContent(/ties to Patricia Johnson's accounts, [\d,]+ USD/)
    expect(main).toHaveTextContent('Johnson Family Trust — IPS · signed 14 Nov 2025')
    expect(screen.getByRole('link', { name: 'Johnson Household' })).toHaveAttribute('href', '/households/hh-001')
  })

  it('is not found for Robert, even his own', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/clients/cli-001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Client not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Retired CEO')
  })
})

describe('the household and client full views take the full width', () => {
  it.each(['/households/hh-001', '/clients/cli-001'])('%s steps the thread list aside, as Supervision does, so its accounts table fits the main pane at 1024px', async (path) => {
    renderRoutes(routes, path)
    await screen.findByRole('table', { name: /^(Household accounts|Accounts owned)$/ })
    expect(screen.queryByRole('navigation', { name: 'Book' })).not.toBeInTheDocument()
  })
})
