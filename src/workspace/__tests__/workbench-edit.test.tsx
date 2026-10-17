import { describe, it, expect } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, getProposal, saveProposalVersion } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const feed = () => within(screen.getByRole('complementary', { name: 'Live thread' })).getByRole('list', { name: 'Thread feed' })

async function openWorkbench() {
  await createProposal('user-001', 'th-johnson-review', 'acc-002')
  renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return screen.findByRole('grid', { name: 'Legs · v1' })
}

describe('editing a draft version', () => {
  it('announces an exclusion with the count of legs left in the draft', async () => {
    const legs = await openWorkbench()
    const total = within(legs).getAllByRole('row').length - 1
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    await waitFor(() => expect(document.querySelector('[data-part="announcer"]')).toHaveTextContent(`QAI excluded · ${total - 1} of ${total} legs in the draft`))
  })

  it('x excludes the focused leg, the engine previews the draft, and Save posts v2 to the live thread', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    const draftLegs = await screen.findByRole('grid', { name: 'Legs · draft' })
    await waitFor(() => expect(within(draftLegs).getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true'))
    expect(within(draftLegs).getByRole('row', { name: /^QAI/ })).toHaveTextContent('EXCLUDED')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(bar).toHaveTextContent('Draft · not saved')
    const save = within(bar).getByRole('button', { name: 'Save as v2' })
    await waitFor(() => expect(save).toBeEnabled())
    // While the save itself is in flight, the bar says so: too brief to catch with a query, so every state of the bar is recorded.
    const seen = new Set<string>()
    const watch = new MutationObserver(() => seen.add(bar.textContent ?? ''))
    watch.observe(bar, { subtree: true, childList: true, characterData: true })
    await userEvent.setup().click(save)
    expect(await within(bar).findByText('Saved as v2 · posted to the thread.')).toBeInTheDocument()
    watch.disconnect()
    expect([...seen].some((text) => text.includes('Saving…'))).toBe(true)
    await waitFor(() => expect(feed()).toHaveTextContent('v2 · Workbench edits: excluded IQ Hedge Multi-Strategy Tracker ETF.'))
    expect(await screen.findByRole('grid', { name: 'Legs · v2' })).toBeInTheDocument()
  })

  it('an invalid quantity is refused by the engine with its reason; Save stays disabled; a valid one saves with mod+S', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^INTC/ }).focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · INTC' })
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '0{Enter}')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('INTC: the quantity must be a positive whole number of shares.')
    expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeDisabled()
    // Beside the edit as well: the field is marked and carries the engine's reason.
    expect(quantity).toHaveAttribute('aria-invalid', 'true')
    expect(quantity).toHaveAccessibleDescription('INTC: the quantity must be a positive whole number of shares.')
    await user.clear(quantity)
    await user.type(quantity, '6000{Enter}')
    await waitFor(() => expect(within(bar).queryByRole('alert')).toBeNull())
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled())
    await user.keyboard('{Control>}s{/Control}')
    await waitFor(() => expect(store().proposals[0]!.versions).toHaveLength(2))
    expect(store().proposals[0]!.versions[1]!.edits).toEqual([{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }])
  })

  it('unchecking every lot is refused; choosing the short-term SPY lot is a specific-identification edit', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^SPY/ }).focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · SPY' })
    const user = userEvent.setup()
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-0/ }))
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('SPY: choose at least one lot.')
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ }))
    await waitFor(() => expect(within(bar).queryByRole('alert')).toBeNull())
    await user.click(within(bar).getByRole('button', { name: 'Save as v2' }))
    await waitFor(() => expect(feed()).toHaveTextContent('v2 · Workbench edits: chose specific lots for SPY.'))
  })

  it('Discard returns to the latest version', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    await userEvent.setup().click(within(bar).getByRole('button', { name: 'Discard' }))
    expect(await screen.findByRole('grid', { name: 'Legs · v1' })).toBeInTheDocument()
    expect(bar).toHaveTextContent('Showing v1')
  })

  it('states that an approval applies to an older version', async () => {
    const created = await createProposal('user-001', 'th-johnson-review', 'acc-002')
    await approveProposal('user-001', created.id, 1, created.versions[0]!.fingerprint)
    renderRoutes(routes, '/proposals/prop-0001')
    const legs = await screen.findByRole('grid', { name: 'Legs · v1' })
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled())
    await userEvent.setup().click(within(bar).getByRole('button', { name: 'Save as v2' }))
    expect(await screen.findByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
  })

  it('mod+S never opens the browser save dialog, and saves nothing from another text field or while a dialog is open', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled())
    const composer = within(screen.getByRole('complementary', { name: 'Live thread' })).getByRole('textbox')
    act(() => composer.focus())
    const inComposer = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })
    act(() => { composer.dispatchEvent(inComposer) })
    expect(inComposer.defaultPrevented).toBe(true)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('data-state', 'open')
    document.body.append(dialog)
    act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true })) })
    dialog.remove()
    await new Promise((r) => setTimeout(r, 50))
    expect(store().proposals[0]!.versions).toHaveLength(1)
    expect(bar).toHaveTextContent('Draft · not saved')
  })

  it('mod+S saves with focus on a lot checkbox, which is not a text field', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^SPY/ }).focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · SPY' })
    const user = userEvent.setup()
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ }))
    const bar = screen.getByRole('group', { name: 'Draft version' })
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled())
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ })).toHaveFocus()
    await user.keyboard('{Meta>}s{/Meta}')
    await waitFor(() => expect(store().proposals[0]!.versions).toHaveLength(2))
  })

  it('a draft left behind is kept, with a quiet note on return', async () => {
    await createProposal('user-001', 'th-johnson-review', 'acc-002')
    const { router } = renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
    const legs = await screen.findByRole('grid', { name: 'Legs · v1' })
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    await screen.findByRole('grid', { name: 'Legs · draft' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Back to the thread' }))
    await screen.findByRole('heading', { level: 1, name: /Johnson/ })
    await act(() => router.navigate(-1))
    const bar = await screen.findByRole('group', { name: 'Draft version' })
    expect(within(bar).getByText(/^Unsaved draft/)).toBeInTheDocument()
    expect(await screen.findByRole('grid', { name: 'Legs · draft' })).toBeInTheDocument()
    await user.click(within(bar).getByRole('button', { name: 'Discard' }))
    expect(within(bar).queryByText(/^Unsaved draft/)).toBeNull()
  })

  async function openLeg(symbol: string) {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: new RegExp(`^${symbol}`) }).focus())
    await userEvent.keyboard('{Enter}')
    return screen.findByRole('region', { name: `Leg · ${symbol}` })
  }
  const savedEdits = () => store().proposals[0]!.versions[1]?.edits

  it('a typed quantity saves with mod+S without Enter or blur: what is on screen is what saves', async () => {
    const detail = await openLeg('INTC')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '700')
    await user.keyboard('{Control>}s{/Control}')
    await waitFor(() => expect(savedEdits()).toEqual([{ kind: 'quantity', symbol: 'INTC', quantity: 700 }]))
  })

  it('a quantity committed, then retyped, saves the retyped value', async () => {
    const detail = await openLeg('INTC')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '700')
    await user.tab()
    await user.clear(quantity)
    await user.type(quantity, '650')
    await user.keyboard('{Control>}s{/Control}')
    await waitFor(() => expect(savedEdits()).toEqual([{ kind: 'quantity', symbol: 'INTC', quantity: 650 }]))
  })

  it('typing then clicking Save saves the typed value, waiting for its preview', async () => {
    const detail = await openLeg('INTC')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '450')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    // Typed but not committed: Save is already pressable, and commits the field first.
    expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled()
    await user.click(within(bar).getByRole('button', { name: 'Save as v2' }))
    await waitFor(() => expect(savedEdits()).toEqual([{ kind: 'quantity', symbol: 'INTC', quantity: 450 }]))
    expect(await within(bar).findByText('Saved as v2 · posted to the thread.')).toBeInTheDocument()
  })

  it('typing 0 then mod+S is refused by the engine and saves nothing', async () => {
    const detail = await openLeg('INTC')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '0')
    await user.keyboard('{Control>}s{/Control}')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('INTC: the quantity must be a positive whole number of shares.')
    await waitFor(() => expect(within(bar).queryByText('Saving once the preview is ready…')).toBeNull())
    expect(store().proposals[0]!.versions).toHaveLength(1)
  })

  it('the saved note goes as soon as the typed quantity changes', async () => {
    const detail = await openLeg('INTC')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '700{Enter}')
    await user.keyboard('{Control>}s{/Control}')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByText('Saved as v2 · posted to the thread.')).toBeInTheDocument()
    await user.type(quantity, '5')
    expect(within(bar).queryByText('Saved as v2 · posted to the thread.')).toBeNull()
  })

  it('text that is not a number is marked on the field, and neither Save nor mod+S saves anything', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    act(() => within(legs).getByRole('row', { name: /^INTC/ }).focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · INTC' })
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const bar = screen.getByRole('group', { name: 'Draft version' })
    const save = within(bar).getByRole('button', { name: 'Save as v2' })
    await waitFor(() => expect(save).toBeEnabled())
    const user = userEvent.setup()
    // A dirty draft (GLD excluded) with text that does not parse.
    await user.clear(quantity)
    await user.type(quantity, 'abc')
    expect(quantity).toHaveAccessibleDescription('Enter a number of shares')
    expect(save).toBeDisabled()
    await user.keyboard('{Control>}s{/Control}')
    await new Promise((r) => setTimeout(r, 100))
    expect(store().proposals[0]!.versions).toHaveLength(1)
    expect(within(bar).queryByText('Saving once the preview is ready…')).toBeNull()
    // Back to a number: Save commits it and saves exactly what is on screen.
    await user.clear(quantity)
    await user.type(quantity, '450')
    expect(save).toBeEnabled()
    await user.click(save)
    await waitFor(() => expect(store().proposals[0]!.versions[1]?.edits).toEqual([
      { kind: 'exclude', symbol: 'GLD' }, { kind: 'quantity', symbol: 'INTC', quantity: 450 },
    ]))
  })

  it('on a clean draft, text that is not a number leaves Save disabled and mod+S inert', async () => {
    const detail = await openLeg('INTC')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, 'abc')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeDisabled()
    await user.keyboard('{Control>}s{/Control}')
    expect(within(bar).queryByText('Saving once the preview is ready…')).toBeNull()
    expect(bar).toHaveTextContent('Showing v1')
  })

  it('a refused draft shows the latest version under its own caption, and claims no lot takes or tax figures', async () => {
    const detail = await openLeg('SPY')
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '5000{Enter}')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('SPY: the account holds fewer shares than that.')
    expect(await screen.findByRole('grid', { name: 'Legs · v1 · the draft was refused' })).toBeInTheDocument()
    expect(screen.queryByRole('grid', { name: 'Legs · draft' })).toBeNull()
    for (const lot of within(detail).getAllByRole('checkbox')) expect(lot).not.toHaveAccessibleName(/ of /)
    expect(screen.queryByRole('region', { name: 'Tax effect estimate' })).toBeNull()
    expect(screen.getAllByText('Shown once the draft is previewed.').length).toBeGreaterThan(0)
  })

  it('a draft that changes nothing is refused on save (NO_CHANGE), and Save stays disabled until the next edit', async () => {
    const detail = await openLeg('SPY')
    const user = userEvent.setup()
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ }))
    const bar = screen.getByRole('group', { name: 'Draft version' })
    const save = within(bar).getByRole('button', { name: 'Save as v2' })
    await waitFor(() => expect(save).toBeEnabled())
    // Someone saves the same edits first: edits are part of a version's fingerprint, so only an identical edit set changes nothing.
    await saveProposalVersion('user-001', 'prop-0001', [{ kind: 'lots', symbol: 'SPY', lotIds: ['lot-pos-020-0', 'lot-pos-020-1'] }])
    await user.click(save)
    expect(await within(bar).findByRole('alert')).toHaveTextContent('Nothing differs from v2.')
    const next = await within(bar).findByRole('button', { name: 'Save as v3' })
    expect(next).toBeDisabled()
    expect(store().proposals[0]!.versions).toHaveLength(2)
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ }))
    await waitFor(() => expect(next).toBeEnabled())
    expect(within(bar).queryByRole('alert')).toBeNull()
  })

  it('mod+S sends no save while the NO_CHANGE refusal holds a dirty draft', async () => {
    const detail = await openLeg('SPY')
    const user = userEvent.setup()
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ }))
    const bar = screen.getByRole('group', { name: 'Draft version' })
    const save = within(bar).getByRole('button', { name: 'Save as v2' })
    await waitFor(() => expect(save).toBeEnabled())
    // The refetch after the refusal is held at v1 until released, so the draft stays dirty against v1 with the refusal showing.
    const v1 = await getProposal('user-001', 'prop-0001')
    let held = true
    server.use(http.get('/api/workspace/proposals/:id', () => (held ? HttpResponse.json(v1) : undefined)))
    await saveProposalVersion('user-001', 'prop-0001', [{ kind: 'lots', symbol: 'SPY', lotIds: ['lot-pos-020-0', 'lot-pos-020-1'] }])
    const saves: string[] = []
    const countSaves = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname === '/api/workspace/proposals/prop-0001/versions') saves.push(request.url)
    }
    server.events.on('request:start', countSaves)
    try {
      await user.click(save)
      expect(await within(bar).findByRole('alert')).toHaveTextContent('Nothing differs from v2.')
      expect(bar).toHaveTextContent('Draft · not saved')
      expect(saves).toHaveLength(1)
      await user.keyboard('{Control>}s{/Control}')
      await user.keyboard('{Meta>}s{/Meta}')
      // Time for a save the shortcut wrongly started to reach the engine.
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(saves).toHaveLength(1)
      expect(within(bar).getByRole('alert')).toHaveTextContent('Nothing differs from v2.')
      expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeDisabled()
    } finally {
      server.events.removeListener('request:start', countSaves)
      held = false
    }
    expect(store().proposals[0]!.versions).toHaveLength(2)
  })

  it('the lots refusal describes the lots it concerns', async () => {
    const detail = await openLeg('SPY')
    await userEvent.setup().click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-0/ }))
    await waitFor(() => expect(within(detail).getByRole('group', { name: /Lots sold/ })).toHaveAccessibleDescription('SPY: choose at least one lot.'))
  })

  it('compliance gets no browser save dialog either', async () => {
    await createProposal('user-001', 'th-johnson-review', 'acc-002')
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/proposals/prop-0001')
    await screen.findByText('You can read this proposal but not change it.')
    const press = new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true })
    act(() => { document.body.dispatchEvent(press) })
    expect(press.defaultPrevented).toBe(true)
  })

  it('compliance reads the workbench but cannot edit it', async () => {
    await createProposal('user-001', 'th-johnson-review', 'acc-002')
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/proposals/prop-0001')
    const legs = await screen.findByRole('grid', { name: 'Legs · v1' })
    expect(screen.getByText('You can read this proposal but not change it.')).toBeInTheDocument()
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    expect(screen.queryByRole('grid', { name: 'Legs · draft' })).toBeNull()
  })
  it('with single-key shortcuts off, the focused leg\'s x still excludes it and Ctrl+S still saves', async () => {
    localStorage.setItem('ws-single-keys', 'off')
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    const draftLegs = await screen.findByRole('grid', { name: 'Legs · draft' })
    await waitFor(() => expect(within(draftLegs).getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true'))
    await userEvent.keyboard('{Control>}s{/Control}')
    expect(await within(screen.getByRole('group', { name: 'Draft version' })).findByText('Saved as v2 · posted to the thread.')).toBeInTheDocument()
  })
})
