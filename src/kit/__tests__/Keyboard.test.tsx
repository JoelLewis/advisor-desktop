import { describe, it, expect, vi } from 'vitest'
import { useMemo } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeyboardProvider } from '@/kit/keyboard/KeyboardProvider'
import { useJumpKeys } from '@/kit/keyboard/use-jump-keys'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { isEditableTarget, matchDestinations } from '@/kit/keyboard/keys'
import { Page } from '@/kit/page/Page'
import { Button } from '@/kit/button/Button'
import { DataTable } from '@/kit/data-table/DataTable'

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
          getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }} />
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
})
