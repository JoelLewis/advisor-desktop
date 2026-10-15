import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { matchRoutes } from 'react-router-dom'
import { routes } from '@/app/routes'
import { http, HttpResponse } from 'msw'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { getSupervisionRecords } from '@/services/compliance'
import { fmtResult, fmtEasternStamp } from '@/kit/measure'
import { previewRebalance } from '@/services/oms'
import { RouteError } from '@/app/RouteError'

const renderAt = (path: string) => renderRoutes(routes, path)

async function renderKitReady() {
  const view = renderAt('/kit')
  await waitFor(() => expect(view.container.querySelector('[data-kit-ready="true"]')).not.toBeNull(), { timeout: 4000 })
  return view
}

describe('routes', () => {
  it.each(['/kit', '/supervision', '/archive', '/prospects/prsp-011', '/billing', '/risk', '/models', '/models/mod-005', '/blotter', '/practice', '/reconciliation'])('%s loads its page lazily', (path) => {
    const [match] = matchRoutes(routes, path)!.slice(-1)
    expect(match!.route.lazy).toBeTypeOf('function')
    expect(match!.route.element).toBeUndefined()
  })
  it("an unknown path shows the not-found page with the demo's two starting points, and nothing else", async () => {
    renderAt('/portfolios/trading')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    const links = within(main).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([['The workspace', '/'], ['The Brief', '/t/th-brief']])
    expect(within(main).getByRole('list', { name: 'Starting points' })).toBeInTheDocument()
  })
  it.each([
    ['/', 'Workspace · Advisor Desktop'],
    ['/t/th-brief', 'Brief · Advisor Desktop'],
    ['/t/th-pell', 'Dr. Amanda Pell · Advisor Desktop'],
    ['/billing', 'Billing · Advisor Desktop'],
    ['/no-such-page', 'Page not found · Advisor Desktop'],
  ])('%s is titled "%s"', async (path, title) => {
    renderAt(path)
    await waitFor(() => expect(document.title).toBe(title))
  })

  it('a route that throws shows the kit page with the way back, and the error only inside its details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const swallow = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', swallow)
    const Boom = () => { throw new Error('The engine has no account acc-999') }
    try {
      renderRoutes([{ path: '/', errorElement: <RouteError />, element: <Boom /> }], '/')
      expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
      const main = screen.getByRole('main')
      expect(within(main).getByRole('link', { name: 'The workspace' })).toHaveAttribute('href', '/')
      const details = main.querySelector('details')
      expect(details).not.toBeNull()
      expect(details).toHaveTextContent('What the app reported')
      expect(details).toHaveTextContent('The engine has no account acc-999')
      expect(document.title).toBe('Something went wrong · Advisor Desktop')
    } finally {
      window.removeEventListener('error', swallow)
      consoleError.mockRestore()
    }
  })
  it('the kit is not ready while loading', async () => {
    const { container } = renderAt('/kit')
    expect(container.querySelector('[data-kit-ready="true"]')).toBeNull()
    expect(await within(await screen.findByRole('main')).findByRole('status')).toHaveTextContent('Loading the account from the engine…')
  })
  it('the kit becomes ready on acc-002 data', async () => {
    await renderKitReady()
    const readings = screen.getByRole('heading', { name: 'Readings' }).closest('section')
    expect(readings).not.toBeNull()
    expect(within(readings as HTMLElement).getByText('Robert Johnson Individual')).toBeTruthy()
  })
  it('shows all three visibility bands', async () => {
    await renderKitReady()
    for (const w of ['Only you', "Firm only · client can't see", 'CLIENT CAN SEE']) {
      expect(screen.getAllByText(w).length).toBeGreaterThanOrEqual(2)
    }
  })
  it('records: the approval is a real engine record, the preview awaits a signature', async () => {
    await renderKitReady()
    const records = screen.getByRole('heading', { name: 'Records' }).closest('section') as HTMLElement
    const r = within(records)
    expect(r.getByText('AWAITING YOUR SIGNATURE')).toBeInTheDocument()
    expect(r.getByText('APPROVED')).toBeInTheDocument()
    expect(r.getAllByText('Mark Davis').length).toBeGreaterThanOrEqual(1)
    expect(r.getByText('sr-002')).toBeInTheDocument()
    const sr002 = (await getSupervisionRecords('user-001', 'comp-006')).find((rec) => rec.id === 'sr-002')!
    expect(r.getAllByText(fmtEasternStamp(sr002.timestamp)).length).toBeGreaterThanOrEqual(2)
    expect(r.getByRole('article', { name: 'Potential wash sale cleared — Johnson INTC/SMH' })).toBeInTheDocument()
    expect(records).not.toHaveTextContent('Advisor of record')
    expect(records).not.toHaveTextContent('REC-EXAMPLE')
  })
  it('the tax tape states the year-to-date results its estimate nets against', async () => {
    await renderKitReady()
    const [preview] = await previewRebalance('user-001', { accountIds: ['acc-002'], taxAware: true })
    const ytd = preview!.ytdRealizedOnReturn!
    const tape = screen.getByRole('region', { name: 'Tax effect estimate' })
    expect(tape).toHaveTextContent(`year-to-date realized results (short-term ${fmtResult(ytd.shortTerm)}, long-term ${fmtResult(ytd.longTerm)} USD)`)
    expect(tape).not.toHaveTextContent("legs only")
  })
  it('the cash line has no share count or price', async () => {
    await renderKitReady()
    const holdings = screen.getByRole('table', { name: 'Holdings' })
    const cash = within(holdings).getByRole('cell', { name: 'CASH' }).closest('tr') as HTMLElement
    const cells = within(cash).getAllByRole('cell')
    expect(cells[1]).toHaveTextContent('—')
    expect(cells[2]).toHaveTextContent('—')
    expect(cash).toHaveTextContent('225,504')
    expect(cash).not.toHaveTextContent('225,504.00')
  })
  it('the footnote the tax figure points to is on the page', async () => {
    await renderKitReady()
    const fig = screen.getByRole('group', { name: /^\$/ })
    expect(fig).toHaveAccessibleDescription(/^Source: Rebalance preview · estimated tax/)
    expect(screen.getByText(/^Source: Rebalance preview · estimated tax for Robert Johnson Individual/)).toBeInTheDocument()
  })
  it('the max drift reading and its gauge agree on status, and every gauge shares one scale', async () => {
    const { container } = await renderKitReady()
    const readings = screen.getByRole('heading', { name: 'Readings' }).closest('section') as HTMLElement
    const label = within(readings).getByText(/^Max drift · /).textContent!.replace('Max drift · ', '')
    const readingStatus = readings.querySelector('[data-status]')!.getAttribute('data-status')
    const gauge = within(screen.getByRole('heading', { name: 'Drift against model' }).closest('section') as HTMLElement)
      .getByText(label, { selector: '[data-part="label"]' }).parentElement as HTMLElement
    expect(gauge.querySelector('[data-status]')!.getAttribute('data-status')).toBe(readingStatus)
    const widths = [...container.querySelectorAll('svg[role="img"] > rect:not([data-part])')]
      .filter((r) => r.closest('svg')!.getAttribute('width') === '200').map((r) => r.getAttribute('width'))
    expect(widths.length).toBeGreaterThan(1)
    expect(new Set(widths).size).toBe(1)
  })
  it('sets every loss in the result columns heavier', async () => {
    await renderKitReady()
    const losses = screen.getAllByText(/^−/, { selector: 'td span' })
    expect(losses.length).toBeGreaterThan(0)
    for (const loss of losses) expect(loss).toHaveClass('font-semibold')
  })
  it('the key sheet lists the gallery\'s own jump key', async () => {
    await renderKitReady()
    await userEvent.keyboard('?')
    const sheet = screen.getByRole('dialog', { name: 'Keyboard' })
    expect(within(sheet).getByText('t')).toBeInTheDocument()
    expect(within(sheet).getByText('Cycle theme')).toBeInTheDocument()
  })
  it('the kit shows the engine error message when its data fails to load', async () => {
    server.use(http.get('/api/workspace/people', () => HttpResponse.json({ message: 'Directory offline' }, { status: 500 })))
    renderAt('/kit')
    expect(await screen.findByRole('alert')).toHaveTextContent('Directory offline')
  })
  it('the shell shows the engine error message when threads fail with a 500', async () => {
    server.use(http.get('/api/workspace/threads', () => HttpResponse.json({ message: 'Threads store unavailable' }, { status: 500 })))
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Threads store unavailable')
  })
  it('the kit shows a Workspace embeds pane: the rebalance preview and a real Drift Monitor finding', async () => {
    await renderKitReady()
    const pane = screen.getByRole('heading', { name: 'Workspace embeds' }).closest('section') as HTMLElement
    const p = within(pane)
    expect(await p.findByRole('region', { name: 'Rebalance preview · Robert Johnson Individual' })).toBeInTheDocument()
    expect(p.getByRole('article', { name: /^Drift Monitor: .* is outside its tolerance band\.$/ })).toBeInTheDocument()
  })
  it('the kit never writes conversation state: the Johnson thread has no finding after it renders', async () => {
    await renderKitReady()
    const thread = await (await fetch('/api/workspace/threads/th-johnson-review', { headers: { 'X-Viewer': 'user-001' } })).json()
    expect(thread.messages.filter((m: { kind: string }) => m.kind === 'agent_finding')).toHaveLength(0)
  })
})
