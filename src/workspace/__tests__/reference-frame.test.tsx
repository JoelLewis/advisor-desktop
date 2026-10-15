import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes, renderWithProviders } from '@/test/render'
import { resolveBreak, getReconciliation } from '@/services/reference'
import { ReferencePage } from '@/workspace/reference/ReferencePage'

const threadNav = () => screen.getByRole('navigation', { name: 'Threads' })
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the reference frame', () => {
  it('links back to the thread, bands the page firm-only, titles it once and ends with Methods & sources', () => {
    renderWithProviders(
      <ReferencePage title="Billing" from="th-johnson-meeting" methods={[{ label: 'Schedule', text: 'Tiered.', modeled: false }, { label: 'Quarter-end values', text: 'Modeled, not realized.', modeled: true }]}>
        <p>Readings</p>
      </ReferencePage>,
    )
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    expect(screen.getByRole('note', { name: `Visibility: Larkfield team · no client can see this` })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Billing' })).toBeInTheDocument()
    const methods = screen.getByRole('region', { name: 'Methods & sources' })
    expect(within(methods).getAllByText('MODELED')).toHaveLength(1)
    expect(methods).toHaveTextContent('Quarter-end valuesMODELED')
  })
  it('names the clients a page is about, as a thread band does', () => {
    renderWithProviders(<ReferencePage title="Risk" from={null} methods={[]} about={['Robert Johnson', 'Patricia Johnson']}><p>Readings</p></ReferencePage>)
    expect(screen.getByRole('note', { name: "Visibility: Larkfield team · Robert and Patricia can't see this" })).toBeInTheDocument()
  })
})

describe('the Desk pane', () => {
  afterEach(() => sessionStorage.clear())

  it("offers the firm the Reference group, beneath the Desk's own links", async () => {
    renderRoutes(routes, '/')
    const reference = await within(threadNav()).findByRole('heading', { level: 2, name: 'Reference' })
    const pane = reference.closest('section') as HTMLElement
    expect(within(pane).getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Billing', '/billing'], ['Reconciliation', '/reconciliation'], ['Risk', '/risk'], ['Models', '/models'], ['Practice', '/practice'], ['Blotter', '/blotter'],
    ])
  })

  it('offers an outsider none of it', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/')
    const nav = await screen.findByRole('navigation', { name: 'Threads' })
    await within(nav).findByRole('link', { name: 'Robert Johnson' })
    expect(within(nav).queryByRole('heading', { name: 'Reference' })).toBeNull()
  })
})

describe('the command line', () => {
  it('goes to every reference view, each thread account’s risk and attribution, and each model', async () => {
    renderRoutes(routes, '/')
    await within(threadNav()).findByRole('link', { name: 'Brief' })
    await userEvent.keyboard('/')
    const box = await screen.findByRole('combobox', { name: 'Go to' })
    await waitFor(() => expect(box).toHaveFocus())
    await waitFor(() => {
      const names = screen.getAllByRole('option').map((o) => o.textContent)
      for (const name of ['Billing', 'Reconciliation', 'Risk · book', 'Models', 'Practice', 'Blotter', 'Risk · Robert Johnson Individual',
        'Attribution · Robert Johnson Individual', 'Model · Ultra-HNW Multi-Strategy']) expect(names).toContain(name)
    })
  })
})

describe("the Brief's reconciliation line", () => {
  it("is Today's row for the open break, and links to the view", async () => {
    renderRoutes(routes, '/t/th-brief')
    const today = await screen.findByRole('region', { name: 'Today' })
    const line = within(today).getAllByRole('listitem').find((li) => li.textContent?.includes('Reconciliation · 1 open break'))
    if (!line) throw new Error("Today has a reconciliation row")
    expect(within(line).getByRole('link', { name: 'Open reconciliation' })).toHaveAttribute('href', '/reconciliation?from=th-brief')
  })

  it('leaves Today once the break is resolved', async () => {
    const brk = (await getReconciliation('user-001')).breaks.find((b) => b.id === 'brk-002')
    if (!brk) throw new Error('brk-002 is listed')
    await resolveBreak('user-001', { breakId: brk.id, fingerprint: brk.fingerprint, resolution: 'timing_difference', rationale: 'Posted late.' })
    renderRoutes(routes, '/t/th-brief')
    const today = await screen.findByRole('region', { name: 'Today' })
    expect(within(today).getAllByRole('listitem')).not.toHaveLength(0)
    expect(today).not.toHaveTextContent('Reconciliation')
  })
})
