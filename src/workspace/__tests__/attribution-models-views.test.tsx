import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getReferenceAttribution } from '@/services/reference'
import { fmtReturn } from '@/kit/measure'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the Attribution view', () => {
  afterEach(() => sessionStorage.clear())

  it('reads the Brinson-Fachler rows, the returns, the benchmark and its modeled line', async () => {
    const engine = await getReferenceAttribution('user-001', 'acc-002', 'ytd')
    renderRoutes(routes, '/accounts/acc-002/attribution?from=th-johnson-review')
    expect(await screen.findByRole('heading', { level: 1, name: 'Attribution · Robert Johnson Individual' })).toBeInTheDocument()
    expect(screen.getByRole('note', { name: "Visibility: Larkfield team · Robert can't see this" })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(`Active return${fmtReturn(engine.activeReturn)}%`)
    expect(main).toHaveTextContent('Brinson-Fachler · single period, arithmetic, no linking · returns modeled, not realized')
    expect(screen.getByRole('img', { name: 'Modeled growth of 100 · Robert Johnson Individual against the Growth policy benchmark' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Benchmark components' })).toHaveTextContent('Bloomberg US Aggregate')
    expect(screen.getByRole('table', { name: 'Attribution · Year to date' })).toHaveTextContent('US Equity')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('ReturnsMODELED')
  })

  it('ties the effects to the active return in every period', async () => {
    for (const period of ['mtd', 'qtd', 'ytd', '1y', '3y', '5y'] as const) {
      const engine = await getReferenceAttribution('user-001', 'acc-002', period)
      expect(Math.abs(engine.rows.reduce((sum, r) => sum + r.total, 0) - engine.activeReturn)).toBeLessThanOrEqual(0.00005)
    }
  })

  it('changes period over the same derivation', async () => {
    renderRoutes(routes, '/accounts/acc-002/attribution')
    await screen.findByRole('heading', { level: 1, name: 'Attribution · Robert Johnson Individual' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Period' }), 'Three years')
    expect(await screen.findByRole('table', { name: 'Attribution · Three years, cumulative' })).toBeInTheDocument()
    expect(screen.getByText('Portfolio, annualized')).toBeInTheDocument()
  })

  it('takes an asset-class row to the account team thread', async () => {
    renderRoutes(routes, '/accounts/acc-002/attribution')
    await screen.findByRole('heading', { level: 1, name: 'Attribution · Robert Johnson Individual' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share US Equity to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Johnson Rebalance Review' })).toHaveAttribute('href', '/t/th-johnson-review')
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/accounts/acc-002/attribution')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
  })
})

describe('the Models views', () => {
  afterEach(() => sessionStorage.clear())

  it('lists every model with its benchmark, its version and any pending one', async () => {
    renderRoutes(routes, '/models')
    expect(await screen.findByRole('heading', { level: 1, name: 'Models' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Models' })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    const ultra = within(table).getByRole('row', { name: /Ultra-HNW Multi-Strategy/ })
    expect(within(ultra).getByText('v2', { exact: true })).toBeInTheDocument()
    expect(within(ultra).getByText('v3 pending from 1 Apr 2026', { exact: true })).toBeInTheDocument()
    expect(within(ultra).getByRole('link', { name: 'Ultra-HNW Multi-Strategy' })).toHaveAttribute('href', '/models/mod-005')
    expect(table).toHaveTextContent('Education 529 glide-path benchmark')
  })

  it('reads one model: targets with vehicles and indexes, the committee history, the accounts on it', async () => {
    renderRoutes(routes, '/models/mod-005')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ultra-HNW Multi-Strategy' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Targets' })).toHaveTextContent('HFRX Global Hedge Fund')
    const history = screen.getByRole('table', { name: 'Version history' })
    for (const text of ['Mike Chen', 'Investment Committee', 'PENDING APPROVAL', '1 Apr 2026', 'Reduced US equity from 40% to 35%']) expect(history).toHaveTextContent(text)
    expect(history).not.toHaveTextContent(/Sarah Kim|David Park|BXPE/)
    expect(screen.getByRole('table', { name: 'Accounts on this model' })).toHaveTextContent('Chen Family Irrevocable Trust')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Share Ultra-HNW Multi-Strategy v3 to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Model · Ultra-HNW Multi-Strategy' })).toBeInTheDocument()
  })

  it('is not found for an unknown model and for an outsider', async () => {
    const { unmount } = renderRoutes(routes, '/models/mod-999')
    expect(await screen.findByRole('heading', { level: 1, name: 'Model not found' })).toBeInTheDocument()
    unmount()
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/models')
    expect(await screen.findByRole('heading', { level: 1, name: 'Models not found' })).toBeInTheDocument()
  })
})
