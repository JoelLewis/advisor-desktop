import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/kit/data-table/DataTable'
import { isOverflowing } from '@/kit/data-table/use-overflowing'
import { Num } from '@/kit/data-table/Num'
import type { Column } from '@/kit/data-table/types'
import { MINUS, MeasureError, fmtMoney, fmtQuantity, fmtResult } from '@/kit/measure'

type Row = { id: string; symbol: string; qty: number; value: number; weight: number }
const rows: Row[] = [
  { id: 'a', symbol: 'SPY', qty: 3879, value: 2_018_244, weight: 0.448 },
  { id: 'b', symbol: 'INTC', qty: 7000, value: 199_150, weight: 0.044 },
  { id: 'c', symbol: 'ETHE', qty: 3882.5, value: 71_623, weight: 0.016 },
]
const columns: Column<Row>[] = [
  { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol, sortValue: (r) => r.symbol },
  { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (r) => <Num text={fmtQuantity(r.qty)} />, sortValue: (r) => r.qty },
  { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (r) => fmtMoney(r.value), sortValue: (r) => r.value, proportion: (r) => r.weight },
]

function renderTable(extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <DataTable caption="Holdings" columns={columns} rows={rows} getRowId={(r) => r.id}
      noun={{ singular: 'position', plural: 'positions' }} {...extra} />,
  )
}

describe('DataTable scroll region', () => {
  const wide = (el: HTMLElement, scroll: number, client: number) => {
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scroll })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: client })
  }
  const legs = () => (
    <DataTable caption="Legs" rows={[{ id: 'a' }]} columns={[{ id: 'id', header: 'Id', cell: (r: { id: string }) => r.id }]} getRowId={(r) => r.id} noun={{ singular: 'leg', plural: 'legs' }} />
  )

  it('contains its screen-reader text and, while it fits, is no region and takes no focus', () => {
    const div = document.createElement('div')
    wide(div, 600, 390)
    expect(isOverflowing(div)).toBe(true)
    wide(div, 390, 390)
    expect(isOverflowing(div)).toBe(false)
    const { container } = render(legs())
    const wrapper = container.querySelector('[data-scroll="table"]')!
    expect(wrapper.className).toContain('relative')
    expect(wrapper).not.toHaveAttribute('role')
    expect(wrapper).not.toHaveAttribute('tabindex')
    expect(wrapper).not.toHaveAttribute('data-overflowing')
  })

  it('while it overflows sideways, is a labeled region that takes focus', () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600)
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390)
    try {
      render(legs())
      const region = screen.getByRole('region', { name: 'Legs, scrolls sideways' })
      expect(region).toHaveAttribute('tabindex', '0')
      expect(region).toHaveAttribute('data-overflowing', 'true')
    } finally {
      scrollWidth.mockRestore()
      clientWidth.mockRestore()
    }
  })
})

describe('DataTable', () => {
  it('sets column headers in sentence case, at table size', () => {
    renderTable()
    const header = screen.getByRole('columnheader', { name: /^Symbol/ })
    expect(header.className).not.toContain('uppercase')
    expect(within(header).getByRole('button').className).not.toContain('uppercase')
  })
  it('states its count and puts units in the header', () => {
    renderTable({ total: 3 })
    expect(screen.getByText('3 of 3 positions')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Value USD/ })).toBeInTheDocument()
  })
  it('sorts by a header and reports aria-sort', async () => {
    renderTable()
    const header = screen.getByRole('columnheader', { name: /Value/ })
    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    const first = screen.getAllByRole('row')[1]!
    expect(within(first).getByText('ETHE')).toBeInTheDocument()
  })
  it('has one tab stop and moves the row cursor with J/K and arrows', async () => {
    const onActivate = vi.fn()
    renderTable({ onActivate })
    const body = screen.getAllByRole('row').slice(1)
    expect(body.filter((r) => r.tabIndex === 0)).toHaveLength(1)
    act(() => body[0]!.focus())
    await userEvent.keyboard('j')
    expect(body[1]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(body[2]).toHaveFocus()
    await userEvent.keyboard('k')
    expect(body[1]).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onActivate).toHaveBeenCalledWith(rows[1])
  })
  it('sets fractional digits apart', () => {
    renderTable()
    expect(screen.getByText('.5')).toHaveAttribute('data-fraction', 'true')
  })
  it('renders totals and says what they tie to', () => {
    renderTable({ totals: { label: 'Total', tiesTo: { label: 'account value', expected: 2_289_017, actual: 2_289_017.6 }, cells: { value: fmtMoney(2_289_017) } } })
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('ties to account value')).toBeInTheDocument()
  })
  it('refuses totals that do not tie to what they claim', () => {
    const swallow = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', swallow)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderTable({ totals: { label: 'Total', tiesTo: { label: 'account value', expected: 2_289_017, actual: 2_289_019 }, cells: {} } }))
      .toThrow(MeasureError)
    spy.mockRestore()
    window.removeEventListener('error', swallow)
  })
  it('ties fractions to a tolerance of their own scale', () => {
    const swallow = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', swallow)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tie = (actual: number) => ({ totals: { label: 'Total', tiesTo: { label: 'the active return', expected: 0.0123, actual, tolerance: 0.00005 }, cells: {} } })
    expect(() => renderTable(tie(0.0123 + 0.00004))).not.toThrow()
    expect(() => renderTable(tie(0.0123 + 0.0001))).toThrow(MeasureError)
    spy.mockRestore()
    window.removeEventListener('error', swallow)
  })
  it('sets a loss heavier than a gain', () => {
    render(<p><Num text={fmtResult(-1_200)} /><Num text={fmtResult(1_200)} /></p>)
    expect(screen.getByText(`${MINUS}1,200`)).toHaveClass('font-semibold')
    expect(screen.getByText('+1,200')).not.toHaveClass('font-semibold')
  })
  it('says its own empty sentence in place of "No rows."', () => {
    renderTable({ rows: [], total: 0, empty: 'Recorded acts appear here.' })
    expect(screen.getByText('Recorded acts appear here.')).toBeInTheDocument()
    expect(screen.queryByText('No positions.')).toBeNull()
  })
  it('handles zero rows without crashing', () => {
    renderTable({ rows: [], total: 0 })
    expect(screen.getByText('0 of 0 positions')).toBeInTheDocument()
    expect(screen.getByText('No positions.')).toBeInTheDocument()
  })
  it('keeps exactly one tab stop after rows shrink past the cursor', async () => {
    const view = renderTable({ onActivate: () => {} })
    act(() => screen.getAllByRole('row')[1]!.focus())
    await userEvent.keyboard('{End}')
    await act(async () => {
      view.rerender(
        <DataTable caption="Holdings" columns={columns} rows={rows.slice(0, 1)} getRowId={(r) => r.id} onActivate={() => {}}
          noun={{ singular: 'position', plural: 'positions' }} />,
      )
    })
    const body = screen.getAllByRole('row').slice(1)
    expect(body.filter((r) => r.tabIndex === 0)).toHaveLength(1)
  })
  it('keeps the cursor on the same row when a sort reorders rows', async () => {
    renderTable({ onActivate: () => {} })
    act(() => screen.getAllByRole('row')[1]!.focus())
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Value/ })).getByRole('button'))
    const body = screen.getAllByRole('row').slice(1)
    expect(body.filter((r) => r.tabIndex === 0)).toHaveLength(1)
    expect(within(body.find((r) => r.tabIndex === 0)!).getByText('SPY')).toBeInTheDocument()
  })
  it('jumps with Home and End', async () => {
    renderTable({ onActivate: () => {} })
    const body = screen.getAllByRole('row').slice(1)
    act(() => body[0]!.focus())
    await userEvent.keyboard('{End}')
    expect(body[2]).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(body[0]).toHaveFocus()
  })
  it('activates the original object of the first sorted row', async () => {
    const onActivate = vi.fn()
    renderTable({ onActivate })
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Value/ })).getByRole('button'))
    act(() => screen.getAllByRole('row')[1]!.focus())
    await userEvent.keyboard('{Enter}')
    expect(onActivate).toHaveBeenCalledWith(rows[2])
  })
  it('sorts descending on a second click', async () => {
    renderTable()
    const header = screen.getByRole('columnheader', { name: /Value/ })
    await userEvent.click(within(header).getByRole('button'))
    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'descending')
  })
  it('omits aria-sort on unsortable columns', () => {
    render(
      <DataTable caption="Holdings" columns={[{ id: 'n', header: 'Note', cell: () => 'x' }, columns[0]!]} rows={rows}
        getRowId={(r) => r.id} noun={{ singular: 'position', plural: 'positions' }} />,
    )
    expect(screen.getByRole('columnheader', { name: /Note/ })).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('columnheader', { name: /Symbol/ })).toHaveAttribute('aria-sort', 'none')
  })
  it('does not activate a row when Enter is pressed on a header sort button', async () => {
    const onActivate = vi.fn()
    renderTable({ onActivate })
    act(() => within(screen.getByRole('columnheader', { name: /Value/ })).getByRole('button').focus())
    await userEvent.keyboard('{Enter}')
    expect(onActivate).not.toHaveBeenCalled()
  })
  it('leaves keys typed into a cell input alone', async () => {
    const withInput: Column<Row>[] = [
      ...columns,
      { id: 'note', header: 'Note', cell: (r) => <input aria-label={`note ${r.id}`} /> },
    ]
    renderTable({ columns: withInput, onActivate: () => {} })
    const input = screen.getByLabelText('note b')
    await userEvent.type(input, 'j')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('j')
    const body = screen.getAllByRole('row').slice(1)
    expect(body[1]!.tabIndex).toBe(0)
  })
  it('ignores modifier chords', async () => {
    renderTable({ onActivate: () => {} })
    const body = screen.getAllByRole('row').slice(1)
    act(() => body[0]!.focus())
    await userEvent.keyboard('{Control>}j{/Control}')
    expect(body[0]).toHaveFocus()
  })
  it('accepts capital J and K', async () => {
    renderTable({ onActivate: () => {} })
    const body = screen.getAllByRole('row').slice(1)
    act(() => body[0]!.focus())
    await userEvent.keyboard('J')
    expect(body[1]).toHaveFocus()
    await userEvent.keyboard('K')
    expect(body[0]).toHaveFocus()
  })
  it('states a filtered count', () => {
    renderTable({ rows: rows.slice(0, 1), total: 14, noun: { singular: 'lot', plural: 'lots' } })
    expect(screen.getByText('1 of 14 lots')).toBeInTheDocument()
  })
  it('says when a filter hides everything', () => {
    renderTable({ rows: [], total: 14, noun: { singular: 'lot', plural: 'lots' } })
    expect(screen.getByText('None of 14 lots shown.')).toBeInTheDocument()
  })
  it('sorts a string column alphabetically', async () => {
    renderTable()
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Symbol/ })).getByRole('button'))
    const names = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent)
    expect(names).toEqual(['ETHE', 'INTC', 'SPY'])
  })
  it('does not activate a row when an interactive cell child is clicked', async () => {
    const onActivate = vi.fn()
    const onRemove = vi.fn()
    const withButton: Column<Row>[] = [
      ...columns,
      { id: 'x', header: 'Act', cell: (r) => <button type="button" onClick={() => onRemove(r.id)}>remove {r.id}</button> },
    ]
    renderTable({ columns: withButton, onActivate })
    await userEvent.click(screen.getByRole('button', { name: 'remove a' }))
    expect(onRemove).toHaveBeenCalledWith('a')
    expect(onActivate).not.toHaveBeenCalled()
  })
  it('uses the singular when one row is hidden by a filter', () => {
    renderTable({ rows: [], total: 1, noun: { singular: 'lot', plural: 'lots' } })
    expect(screen.getByText('None of 1 lot shown.')).toBeInTheDocument()
  })
})

describe('DataTable row keys, muted rows, wrapping columns', () => {
  it('runs a row key on the focused row and stops it reaching the page', async () => {
    const run = vi.fn()
    const pageKeys = vi.fn()
    window.addEventListener('keydown', pageKeys)
    renderTable({ rowKeys: [{ key: 'x', run }] })
    const row = screen.getAllByRole('row')[2]!
    act(() => row.focus())
    await userEvent.keyboard('x')
    expect(run).toHaveBeenCalledWith(rows[1])
    expect(pageKeys).not.toHaveBeenCalled()
    window.removeEventListener('keydown', pageKeys)
  })
  it('marks a muted row', () => {
    renderTable({ mutedRow: (r) => r.symbol === 'INTC' })
    expect(screen.getByRole('row', { name: /INTC/ })).toHaveAttribute('data-muted', 'true')
    expect(screen.getByRole('row', { name: /SPY/ })).not.toHaveAttribute('data-muted')
  })
  it('lets a wrapping column wrap', () => {
    render(<DataTable caption="Names" rows={rows} getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }}
      columns={[{ id: 'symbol', header: 'Symbol', cell: (r) => r.symbol, wrap: true }]} />)
    expect(screen.getByRole('cell', { name: 'SPY' })).toHaveClass('whitespace-normal')
  })

  describe('grid semantics', () => {
    type Id = { id: string }
    const idRows: Id[] = [{ id: 'a' }, { id: 'b' }]
    const idColumns: Column<Id>[] = [{ id: 'id', header: 'Id', cell: (r) => r.id }]
    const noun = { singular: 'row', plural: 'rows' }

    it('a read-only table is a plain table with no Tab stop', () => {
      render(<DataTable caption="Read" rows={idRows} columns={idColumns} getRowId={(r) => r.id} noun={noun} />)
      expect(screen.getByRole('table', { name: 'Read' })).not.toHaveAttribute('role')
      for (const row of screen.getAllByRole('row')) expect(row).not.toHaveAttribute('tabindex')
    })

    it('a table with row actions is a grid: one row in the Tab order, expanded state and keys stated', () => {
      render(<DataTable caption="Legs" rows={idRows} columns={idColumns} getRowId={(r) => r.id} noun={noun}
        onActivate={() => {}} expandedRowId="b" rowKeys={[{ key: 'x', run: () => {} }]} />)
      const grid = screen.getByRole('grid', { name: 'Legs' })
      const [a, b] = within(grid).getAllByRole('row').slice(1)
      expect(a).toHaveAttribute('tabindex', '0')
      expect(b).toHaveAttribute('tabindex', '-1')
      const [openerA, openerB] = [a, b].map((row) => within(row as HTMLElement).getAllByRole('gridcell')[0])
      expect(openerA).toHaveAttribute('aria-expanded', 'false')
      expect(openerB).toHaveAttribute('aria-expanded', 'true')
      expect(a).not.toHaveAttribute('aria-expanded')
      expect(a).toHaveAttribute('aria-keyshortcuts', 'Enter x')
    })

    it('renders a row again only when its own data or state changes', () => {
      const cell = vi.fn((r: Id) => r.id)
      const memoColumns: Column<Id>[] = [{ id: 'id', header: 'Id', cell }]
      const { rerender } = render(<DataTable caption="M" rows={idRows} columns={memoColumns} getRowId={(r) => r.id} noun={noun} />)
      cell.mockClear()
      rerender(<DataTable caption="M" rows={idRows} columns={memoColumns} getRowId={(r) => r.id} noun={noun} />)
      expect(cell).not.toHaveBeenCalled()
    })
  })
})
