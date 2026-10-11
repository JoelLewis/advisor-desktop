import { it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderRoutes } from '@/test/render'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { AccountView } from '@/workspace/full-views/AccountView'

const routes = [{ path: '/accounts/:accountId', element: <AccountView /> }, { path: '*', element: <p>elsewhere</p> }]
const account = accounts.find((a) => a.id === 'acc-002')
if (!account) throw new Error('acc-002 missing from the engine data')

it('shows the account name, a gauge per asset class, every position and every tax lot', async () => {
  renderRoutes(routes, '/accounts/acc-002')
  expect(await screen.findByRole('heading', { level: 1, name: account.name })).toBeInTheDocument()
  const drift = computeDriftForAccount(account)
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
  await screen.findByRole('heading', { level: 1, name: account.name })
  expect(screen.queryByRole('link', { name: 'Back to the thread' })).not.toBeInTheDocument()
})

it('an unknown account is not found, with a way home', async () => {
  renderRoutes(routes, '/accounts/acc-nope')
  expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to the workspace' })).toHaveAttribute('href', '/')
})
