import { describe, it, expect, vi } from 'vitest'
import { useContext, useMemo, useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnnouncerProvider } from '@/kit/announcer/AnnouncerProvider'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import { KeyboardContext } from '@/kit/keyboard/keyboard-context'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { isEditableTarget, matchDestinations } from '@/kit/keyboard/keys'
import { Page } from '@/kit/page/Page'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { DataTable } from '@/kit/data-table/DataTable'
import { Outlet, RouterProvider, createMemoryRouter, useNavigate } from 'react-router-dom'
import { providerFuture, routerFuture } from '@/app/router-flags'

function Jumps({ onT, keyName = 't' }: { onT: () => void; keyName?: string }) {
  const bindings = useMemo(() => [{ key: keyName, label: 'Toggle theme', run: onT }], [onT, keyName])
  useJumpKeys('test', bindings)
  return <input aria-label="Notes" />
}

describe('keyboard', () => {
  it('matches destinations by label and alias', () => {
    const d = [{ id: 'kit', label: 'Component kit', aliases: ['kit', 'components'], run: () => {} }]
    expect(matchDestinations('comp', d)).toHaveLength(1)
    expect(matchDestinations('kit', d)).toHaveLength(1)
    expect(matchDestinations('zzz', d)).toHaveLength(0)
  })
  it('puts the destination a query names exactly ahead of those that merely contain it', () => {
    const d = [
      { id: 'thread', label: 'Thread · Johnson Rebalance Review', aliases: [], run: () => {} },
      { id: 'proposal', label: 'Proposal · Johnson rebalance', aliases: [], run: () => {} },
    ]
    expect(matchDestinations('johnson rebalance', d).map((x) => x.id)).toEqual(['proposal', 'thread'])
    expect(matchDestinations('johnson', d).map((x) => x.id)).toEqual(['thread', 'proposal'])
  })
  it('knows editable targets', () => {
    const input = document.createElement('input')
    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(document.createElement('div'))).toBe(false)
  })
  it('runs a jump key, but not while typing or with a modifier', async () => {
    const onT = vi.fn()
    render(<KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider>)
    await userEvent.keyboard('t')
    expect(onT).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Control>}t{/Control}')
    expect(onT).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByLabelText('Notes'))
    await userEvent.keyboard('t')
    expect(onT).toHaveBeenCalledTimes(1)
  })
  it('/ opens the command line and Enter runs the first match', async () => {
    const run = vi.fn()
    render(<KeyboardProvider destinations={[{ id: 'kit', label: 'Component kit', aliases: ['kit'], run }]}><p>x</p></KeyboardProvider>)
    await userEvent.keyboard('/')
    const box = screen.getByRole('combobox', { name: 'Go to' })
    await userEvent.type(box, 'kit{Enter}')
    expect(run).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('? opens the key sheet listing the bindings', async () => {
    render(<KeyboardProvider destinations={[]}><Jumps onT={() => {}} /></KeyboardProvider>)
    await userEvent.keyboard('?')
    const sheet = screen.getByRole('dialog', { name: 'Keyboard' })
    expect(sheet).toHaveTextContent('Toggle theme')
    expect(sheet).toHaveTextContent('Command line')
  })
  it('useFocusAfter moves focus to the page heading', async () => {
    function Harness() {
      const focusAfter = useFocusAfter()
      return <Page title="Kit"><Button onClick={() => focusAfter()}>Withdraw</Button></Page>
    }
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))))
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })
  it('a global j binding does not double-fire with the DataTable row cursor', async () => {
    const onJ = vi.fn()
    const rows = [{ id: 'a' }, { id: 'b' }]
    render(
      <KeyboardProvider destinations={[]}>
        <Jumps onT={onJ} keyName="j" />
        <DataTable caption="Rows" columns={[{ id: 'id', header: 'Id', cell: (r: { id: string }) => r.id }]} rows={rows}
          getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }} onActivate={() => {}} />
      </KeyboardProvider>,
    )
    const body = screen.getAllByRole('row').slice(1)
    act(() => body[0]!.focus())
    await userEvent.keyboard('j')
    expect(body[1]).toHaveFocus()
    expect(onJ).not.toHaveBeenCalled()
    act(() => (document.activeElement as HTMLElement).blur())
    await userEvent.keyboard('j')
    expect(onJ).toHaveBeenCalledOnce()
  })

  it('accepts an inline bindings array without looping, and calls the latest run closure', async () => {
    const seen: string[] = []
    function Inline() {
      const [n, setN] = useState(0)
      useJumpKeys('inline', [{ key: 't', label: 'Toggle', run: () => seen.push(`run${n}`) }])
      return <Button onClick={() => setN(1)}>Bump</Button>
    }
    render(<KeyboardProvider destinations={[]}><Inline /></KeyboardProvider>)
    await userEvent.keyboard('t')
    expect(seen).toEqual(['run0'])
    await userEvent.click(screen.getByRole('button', { name: 'Bump' }))
    await userEvent.keyboard('t')
    expect(seen).toEqual(['run0', 'run1'])
  })
  it('first-registered binding wins a duplicate key, and warns', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    function A() { useJumpKeys('a', useMemo(() => [{ key: 'x', label: 'A', run: first }], [])); return null }
    function B() { useJumpKeys('b', useMemo(() => [{ key: 'x', label: 'B', run: second }], [])); return null }
    render(<KeyboardProvider destinations={[]}><A /><B /></KeyboardProvider>)
    await userEvent.keyboard('x')
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('? with Shift opens the sheet', async () => {
    render(<KeyboardProvider destinations={[]}><p>x</p></KeyboardProvider>)
    await userEvent.keyboard('{Shift>}?{/Shift}')
    expect(screen.getByRole('dialog', { name: 'Keyboard' })).toBeInTheDocument()
  })
  it('ignores / and ? while typing in an input', async () => {
    render(<KeyboardProvider destinations={[]}><Jumps onT={() => {}} /></KeyboardProvider>)
    await userEvent.click(screen.getByLabelText('Notes'))
    await userEvent.keyboard('/?')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('does not fire a jump key while a consumer dialog is open', async () => {
    const onT = vi.fn()
    render(
      <KeyboardProvider destinations={[]}>
        <Jumps onT={onT} />
        <Dialog open onOpenChange={() => {}} title="Other"><p>Body</p></Dialog>
      </KeyboardProvider>,
    )
    await userEvent.keyboard('t')
    expect(onT).not.toHaveBeenCalled()
  })
  it('returns focus to the element focused when / was pressed', async () => {
    render(<KeyboardProvider destinations={[]}><Button>Anchor</Button></KeyboardProvider>)
    const anchor = screen.getByRole('button', { name: 'Anchor' })
    act(() => anchor.focus())
    await userEvent.keyboard('/')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Go to' })).toHaveFocus())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(anchor).toHaveFocus())
  })
  describe('command line', () => {
    const destinations = [
      { id: 'home', label: 'Workspace home', aliases: ['home'], run: vi.fn() },
      { id: 'kit', label: 'Component kit', aliases: ['kit'], run: vi.fn() },
    ]
    it('Enter with no matches does nothing, and states the empty result outside the listbox', async () => {
      render(<KeyboardProvider destinations={destinations}><p>x</p></KeyboardProvider>)
      await userEvent.keyboard('/')
      await userEvent.type(screen.getByRole('combobox', { name: 'Go to' }), 'zzz{Enter}{ArrowDown}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('No destination matches.')
      expect(screen.getByRole('listbox')).not.toContainElement(screen.getByRole('status'))
      expect(destinations[0]!.run).not.toHaveBeenCalled()
    })
    it('resets the query on reopen and moves selection with the arrows', async () => {
      render(<KeyboardProvider destinations={destinations}><p>x</p></KeyboardProvider>)
      await userEvent.keyboard('/')
      await userEvent.type(screen.getByRole('combobox', { name: 'Go to' }), 'ki{Escape}')
      await userEvent.keyboard('/')
      const box = screen.getByRole('combobox', { name: 'Go to' })
      expect(box).toHaveValue('')
      expect(box).toHaveAttribute('aria-autocomplete', 'list')
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      await userEvent.keyboard('{ArrowDown}')
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
      await userEvent.keyboard('{ArrowUp}')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })
  })
  it('forgets a registration\'s order once it unmounts, but keeps it across a re-registration', async () => {
    let orderSize = () => -1
    function Probe() {
      const ctx = useContext(KeyboardContext)
      if (ctx) orderSize = ctx.orderSize
      return null
    }
    function Changing({ label }: { label: string }) { useJumpKeys('changing', [{ key: 'c', label, run: () => {} }]); return null }
    function Harness({ count, label }: { count: number; label: string }) {
      return (
        <KeyboardProvider destinations={[]}>
          <Probe />
          <Jumps onT={() => {}} />
          {Array.from({ length: count }, (_, i) => <Changing key={i} label={label} />)}
        </KeyboardProvider>
      )
    }
    const { rerender } = render(<Harness count={0} label="C" />)
    const baseline = orderSize()
    expect(baseline).toBe(1)
    rerender(<Harness count={3} label="C" />)
    expect(orderSize()).toBe(baseline + 3)
    rerender(<Harness count={3} label="Changed" />)
    expect(orderSize()).toBe(baseline + 3)
    await userEvent.keyboard('?')
    const sheet = screen.getByRole('dialog', { name: 'Keyboard' })
    expect(within(sheet).getAllByRole('definition').map((d) => d.textContent)).toEqual(
      ['Command line', 'This key sheet', 'Toggle theme', 'Changed', 'Changed', 'Changed'],
    )
    await userEvent.keyboard('{Escape}')
    rerender(<Harness count={0} label="Changed" />)
    expect(orderSize()).toBe(baseline)
  })
  it('treats only an open dialog as blocking jump keys', async () => {
    const onT = vi.fn()
    render(
      <KeyboardProvider destinations={[]}>
        <Jumps onT={onT} />
        <div role="dialog" aria-modal="true" data-state="closed" />
      </KeyboardProvider>,
    )
    await userEvent.keyboard('t')
    expect(onT).toHaveBeenCalledOnce()
  })
  it('two components sharing a scope name keep their own bindings', async () => {
    const first = vi.fn()
    const second = vi.fn()
    function One() { useJumpKeys('thread', useMemo(() => [{ key: 'a', label: 'First', run: first }], [])); return null }
    function Two() { useJumpKeys('thread', useMemo(() => [{ key: 'b', label: 'Second', run: second }], [])); return null }
    function Harness({ showTwo }: { showTwo: boolean }) {
      return <KeyboardProvider destinations={[]}><One />{showTwo ? <Two /> : null}</KeyboardProvider>
    }
    const { rerender } = render(<Harness showTwo />)
    await userEvent.keyboard('ab')
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    rerender(<Harness showTwo={false} />)
    await userEvent.keyboard('ab')
    expect(first).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenCalledOnce()
  })
  it('after running a destination, focus lands on the new page heading, not the opener', async () => {
    function Layout() {
      const navigate = useNavigate()
      const destinations = useMemo(() => [{ id: 'kit', label: 'Component kit', aliases: ['kit'], run: () => navigate('/kit') }], [navigate])
      return <KeyboardProvider destinations={destinations}><Button>Opener</Button><Outlet /></KeyboardProvider>
    }
    const router = createMemoryRouter([{ path: '/', element: <Layout />, children: [
      { index: true, element: <Page title="Home"><p>home</p></Page> },
      { path: 'kit', element: <Page title="Kit"><p>kit</p></Page> },
    ] }], { future: routerFuture })
    render(<RouterProvider router={router} future={providerFuture} />)
    const opener = screen.getByRole('button', { name: 'Opener' })
    act(() => opener.focus())
    await userEvent.keyboard('/')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Go to' })).toHaveFocus())
    await userEvent.keyboard('kit{Enter}')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Kit' })).toHaveFocus())
    expect(opener).not.toHaveFocus()
    act(() => opener.focus())
    await userEvent.keyboard('/')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Go to' })).toHaveFocus())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus())
  })
  it('with single-key shortcuts off: t, / and ? do nothing; Ctrl+K and Ctrl+/ still open the command line and the sheet', async () => {
    localStorage.setItem('ws-single-keys', 'off')
    const onT = vi.fn()
    render(<AnnouncerProvider><KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('t/?')
    expect(onT).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog', { name: 'Command line' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Control>}/{/Control}')
    expect(screen.getByRole('dialog', { name: 'Keyboard' })).toBeInTheDocument()
  })
  it('the sheet holds the switch; turning it off stops the single keys and is remembered', async () => {
    const onT = vi.fn()
    const view = render(<AnnouncerProvider><KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('?')
    const toggle = within(screen.getByRole('dialog', { name: 'Keyboard' })).getByRole('switch', { name: 'Single-key shortcuts' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    expect(localStorage.getItem('ws-single-keys')).toBe('off')
    await userEvent.keyboard('{Escape}t')
    expect(onT).not.toHaveBeenCalled()
    view.unmount()
    render(<AnnouncerProvider><KeyboardProvider destinations={[]}><Jumps onT={onT} /></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('{Control>}/{/Control}')
    expect(within(screen.getByRole('dialog', { name: 'Keyboard' })).getByRole('switch', { name: 'Single-key shortcuts' })).not.toBeChecked()
  })

  it('a pointer resting where the keyboard scrolled the list does not take the selection; a real move does', async () => {
    const destinations = ['Billing', 'Blotter', 'Brief'].map((label) => ({ id: label.toLowerCase(), label, aliases: [], run: vi.fn() }))
    render(<AnnouncerProvider><KeyboardProvider destinations={destinations}><p>x</p></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('/')
    const option = (name: string) => screen.getByRole('option', { name })
    fireEvent.pointerMove(option('Billing'), { clientX: 10, clientY: 10 })
    expect(option('Billing')).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(option('Brief')).toHaveAttribute('aria-selected', 'true')
    fireEvent.pointerMove(option('Billing'), { clientX: 10, clientY: 10 })
    expect(option('Brief'), 'the list moved under a resting pointer').toHaveAttribute('aria-selected', 'true')
    fireEvent.pointerMove(option('Blotter'), { clientX: 10, clientY: 40 })
    expect(option('Blotter')).toHaveAttribute('aria-selected', 'true')
  })

  it('a click on a destination goes there; pointing at one makes it active; the active one is kept in view', async () => {
    const billing = vi.fn()
    const destinations = [
      { id: 'kit', label: 'Component kit', aliases: [], run: vi.fn() },
      { id: 'billing', label: 'Billing', aliases: [], run: billing },
    ]
    render(<AnnouncerProvider><KeyboardProvider destinations={destinations}><p>x</p></KeyboardProvider></AnnouncerProvider>)
    await userEvent.keyboard('/')
    const option = screen.getByRole('option', { name: 'Billing' })
    await userEvent.hover(option)
    expect(option).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowUp}')
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
    expect(screen.getByRole('listbox').className).toContain('overflow-y-auto')
    await userEvent.click(screen.getByRole('option', { name: 'Billing' }))
    expect(billing).toHaveBeenCalledOnce()
  })
})
