import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getAccountRisk } from '@/services/reference'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'
import { fmtMoney, fmtWeight } from '@/kit/measure'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('book risk', () => {
  afterEach(() => sessionStorage.clear())

  it('ranks every account against its client tolerance, the largest gap first', async () => {
    renderRoutes(routes, '/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk' })).toBeInTheDocument()
    const rows = within(screen.getByRole('table', { name: 'Accounts against tolerance' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Patel Digital Assets Account')
    expect(rows[1]).toHaveTextContent('ABOVE TOLERANCE')
    expect(within(rows[1] as HTMLElement).getByRole('link', { name: 'Patel Digital Assets Account' })).toHaveAttribute('href', '/accounts/acc-045/risk')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('Value at riskMODELED')
  })

  it("reads each client's household first, and marks an account outside its band asset location when the household is within it", async () => {
    renderRoutes(routes, '/risk')
    await screen.findByRole('heading', { level: 1, name: 'Risk' })
    const households = within(screen.getByRole('table', { name: 'Households against tolerance' })).getAllByRole('row')
    const robert = households.find((r) => r.textContent?.includes('Robert Johnson'))
    expect(robert).toHaveTextContent('Johnson Household')
    expect(robert).toHaveTextContent('WITHIN TOLERANCE')
    const accounts = within(screen.getByRole('table', { name: 'Accounts against tolerance' })).getAllByRole('row')
    const ira = accounts.find((r) => r.textContent?.includes('Robert Johnson Traditional IRA'))
    expect(ira).toHaveTextContent('ASSET LOCATION')
    expect(ira).toHaveTextContent('below Moderate (41–55); household within')
    expect(accounts.find((r) => r.textContent?.includes('Patel Digital Assets Account'))).toHaveTextContent('ABOVE TOLERANCE')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('suitability is judged per household')
  })

  it('takes an account above tolerance to a team thread', async () => {
    renderRoutes(routes, '/risk')
    await screen.findByRole('heading', { level: 1, name: 'Risk' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share Patel Digital Assets Account to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Risk · Patel Digital Assets Account' })).toHaveAttribute('href', '/t/th-ref-0001')
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk not found' })).toBeInTheDocument()
  })
})

describe('account risk', () => {
  afterEach(() => sessionStorage.clear())

  it('reads volatility, beta, VaR, tracking error, the score against tolerance, factors, concentration and stress', async () => {
    const engine = await getAccountRisk('user-001', 'acc-002')
    renderRoutes(routes, '/accounts/acc-002/risk?from=th-johnson-review')
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk · Robert Johnson Individual' })).toBeInTheDocument()
    expect(screen.getByRole('note', { name: "Visibility: Larkfield team · Robert can't see this" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-review')
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(fmtMoney(engine.var95.value))
    expect(main).toHaveTextContent('one month, 95%')
    expect(main).toHaveTextContent('ABOVE TOLERANCE')
    expect(main).toHaveTextContent('Growth policy benchmark')
    expect(screen.getByRole('table', { name: 'Factor exposures' })).toHaveTextContent('Market (equity beta)')
    expect(screen.getByRole('table', { name: 'Stress tests' })).toHaveTextContent('2008 financial crisis')
    expect(screen.getByRole('table', { name: 'Largest positions' })).toHaveTextContent('SPY')
  })

  it('reads the moved book after the release', async () => {
    const before = await getAccountRisk('user-001', 'acc-002')
    release(approvedV1())
    const after = await getAccountRisk('user-001', 'acc-002')
    expect(after.volatility).not.toBe(before.volatility)
    renderRoutes(routes, '/accounts/acc-002/risk')
    await screen.findByRole('heading', { level: 1, name: 'Risk · Robert Johnson Individual' })
    expect(screen.getByRole('main')).toHaveTextContent(`Volatility${fmtWeight(after.volatility)}%`)
  })

  it('is not found for an unknown account and for Dr. Pell', async () => {
    const { unmount } = renderRoutes(routes, '/accounts/acc-999/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
    unmount()
    viewAsOnLoad('prsp-011')
    renderRoutes(routes, '/accounts/acc-002/risk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  })

  it('is one step from the account view, as are its attribution and its model', async () => {
    renderRoutes(routes, '/accounts/acc-002?from=th-johnson-review')
    const nav = await screen.findByRole('navigation', { name: 'Reports' })
    expect(within(nav).getByRole('link', { name: 'Risk' })).toHaveAttribute('href', '/accounts/acc-002/risk?from=th-johnson-review')
    expect(within(nav).getByRole('link', { name: 'Attribution' })).toHaveAttribute('href', '/accounts/acc-002/attribution?from=th-johnson-review')
    expect(await within(nav).findByRole('link', { name: 'Model · Growth' })).toHaveAttribute('href', '/models/mod-002?from=th-johnson-review')
  })
})
