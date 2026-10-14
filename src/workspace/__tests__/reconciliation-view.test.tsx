import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const openCount = () => within(screen.getByRole('table', { name: 'Breaks' })).getAllByRole('row').filter((r) => /OPEN/.test(r.textContent ?? '')).length
const breaks = () => screen.getByRole('table', { name: 'Breaks' })

async function open(path = '/reconciliation') {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Reconciliation' })
  return view
}

describe('the Reconciliation view', () => {
  afterEach(() => sessionStorage.clear())

  it('reads the breaks off the book, the match rates, the trend and the log that explains each feed', async () => {
    await open('/reconciliation?from=th-brief')
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-brief')
    const open002 = within(breaks()).getByRole('row', { name: /brk-002/ })
    for (const text of ['Johnson Family Trust', 'Schwab', 'Cash balance', '660,170', '660,020', 'OPEN']) expect(open002).toHaveTextContent(text)
    expect(within(breaks()).getByRole('row', { name: /brk-003/ })).toHaveTextContent('RESOLVED')
    expect(screen.getByRole('table', { name: 'Integrations' })).toHaveTextContent('MoneyGuidePro')
    expect(within(screen.getByRole('table', { name: 'Integrations' })).getByRole('row', { name: /MoneyGuidePro/ })).toHaveTextContent('PENDING')
    expect(screen.getByRole('list', { name: 'Integration log' })).toHaveTextContent('has not returned it')
    const trend = screen.getByRole('table', { name: '30-day trend' })
    expect(trend).toHaveTextContent('2026-01-27')
    expect(trend).toHaveTextContent('2026-02-25')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('Resolving a break is a binding act')
  })

  it('Adrian resolves brk-002 as a binding act; the row and the counts follow', async () => {
    await open()
    const user = userEvent.setup()
    const openBefore = openCount()
    await user.click(screen.getByRole('button', { name: 'Resolve brk-002' }))
    const dialog = await screen.findByRole('dialog', { name: 'Resolve brk-002?' })
    expect(dialog).toHaveTextContent('Recorded as a binding act in the Archive.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Resolution' }), 'Custodian corrected')
    await user.type(within(dialog).getByRole('textbox', { name: 'Rationale' }), 'Schwab reissued the 24 Feb cash file.')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent('Resolved · REC-0001'))
    await waitFor(() => expect(within(breaks()).getByRole('row', { name: /brk-002/ })).toHaveTextContent('RESOLVED'))
    expect(within(breaks()).getByRole('row', { name: /brk-002/ })).toHaveTextContent('Custodian corrected · Adrian Hale · REC-0001')
    expect(screen.queryByRole('button', { name: 'Resolve brk-002' })).toBeNull()
    await waitFor(() => expect(openCount()).toBe(openBefore - 1))
    expect(store().acts.filter((a) => a.kind === 'resolve_break')).toHaveLength(1)
  })

  it('offers Resolve to neither the analyst nor compliance', async () => {
    for (const viewer of ['user-003', 'cco-001']) {
      viewAsOnLoad(viewer)
      const { unmount } = await open()
      expect(within(breaks()).getByRole('row', { name: /brk-002/ })).toHaveTextContent('OPEN')
      expect(screen.queryByRole('button', { name: 'Resolve brk-002' })).toBeNull()
      unmount()
      sessionStorage.clear()
    }
  })

  it('takes a break to a team thread', async () => {
    await open()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take brk-002 to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Reconciliation · brk-002 · Johnson Family Trust' })).toBeInTheDocument()
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/reconciliation')
    expect(await screen.findByRole('heading', { level: 1, name: 'Reconciliation not found' })).toBeInTheDocument()
  })
})
