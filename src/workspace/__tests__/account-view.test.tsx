import { accountDisplayName } from '@/lib/account-display'
import { it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { routes as appRoutes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { AccountView } from '@/workspace/full-views/AccountView'
import { requireModelManaged } from '@/lib/mandate'

const routes = [{ path: '/accounts/:accountId', element: <AccountView /> }, { path: '*', element: <p>elsewhere</p> }]
const account = accounts.find((a) => a.id === 'acc-002')
if (!account) throw new Error('acc-002 missing from the engine data')

it('shows the account name, a gauge per asset class, every position and every tax lot', async () => {
  renderRoutes(routes, '/accounts/acc-002')
  expect(await screen.findByRole('heading', { level: 1, name: accountDisplayName(account) })).toBeInTheDocument()
  const drift = computeDriftForAccount(requireModelManaged(account))
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const lots = generateTaxLots(account.id, account.totalValue)
  const gauges = within(screen.getByRole('heading', { name: 'Drift against model' }).closest('section') as HTMLElement).getAllByRole('img')
  expect(gauges).toHaveLength(drift.assetClassDrifts.length)
  drift.assetClassDrifts.forEach((d, i) => expect(gauges[i]).toHaveAccessibleName(new RegExp(`^${assetClassLabel(d.assetClass)}: drift`)))
  const holdings = screen.getByRole('table', { name: 'Holdings' })
  expect(within(holdings).getAllByRole('row')).toHaveLength(positions.length + 2)
  expect(within(holdings).getByText('ties to account value')).toBeInTheDocument()
  const taxLots = screen.getByRole('table', { name: 'Tax lots' })
  expect(within(taxLots).getAllByRole('row')).toHaveLength(lots.length + 1)
})

it('links back to the thread only when opened from one', async () => {
  const { unmount } = renderRoutes(routes, '/accounts/acc-002?from=th-johnson-review')
  expect(await screen.findByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-review')
  unmount()
  renderRoutes(routes, '/accounts/acc-002')
  await screen.findByRole('heading', { level: 1, name: accountDisplayName(account) })
  expect(screen.queryByRole('link', { name: 'Back to the thread' })).not.toBeInTheDocument()
})

it('an unknown account is not found, with a way home', async () => {
  renderRoutes(routes, '/accounts/acc-nope')
  expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to the workspace' })).toHaveAttribute('href', '/')
})

it('is firm-only: a client viewer opening the URL is told the account is not found', async () => {
  sessionStorage.setItem('ws-viewer', 'cli-001')
  renderRoutes(routes, '/accounts/acc-002')
  expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  expect(screen.queryByRole('table', { name: 'Holdings' })).toBeNull()
  expect(screen.queryByText(account.name)).toBeNull()
})

it('switching to a client while on the account goes home', async () => {
  const { router } = renderRoutes(appRoutes, '/accounts/acc-002?from=th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: accountDisplayName(account) })
  const user = userEvent.setup()
  const select = await screen.findByRole('combobox', { name: 'View as' })
  await screen.findByRole('option', { name: 'Robert Johnson · Client' })
  await user.selectOptions(select, 'Robert Johnson · Client')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(screen.queryByRole('heading', { level: 1, name: 'Account not found' })).toBeNull()
  expect(await screen.findByRole('heading', { level: 1, name: 'Workspace' })).toBeInTheDocument()
})

it("an unknown account is not found even when a reading's 404 arrives first", async () => {
  server.use(
    http.get('/api/pms/accounts/:id/drift', () => HttpResponse.json({ message: 'No drift for this account' }, { status: 404 })),
    http.get('/api/custodian/accounts/:id', async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      return HttpResponse.json({ message: 'Account not found' }, { status: 404 })
    }),
  )
  let alertShown = false
  const observer = new MutationObserver(() => { if (document.body.textContent?.includes('No drift for this account')) alertShown = true })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  renderRoutes(routes, '/accounts/acc-nope')
  expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  observer.disconnect()
  expect(alertShown).toBe(false)
})
