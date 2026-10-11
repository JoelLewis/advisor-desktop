import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import type { Column } from '@/kit/data-table/types'
import { fmtMoney, fmtQuantity } from '@/kit/measure'

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

describe('DataTable', () => {
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
    body[0]!.focus()
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
    renderTable({ totals: { label: 'Total', tiesTo: 'account value', cells: { value: fmtMoney(2_289_017) } } })
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('ties to account value')).toBeInTheDocument()
  })
  it('handles zero rows without crashing', () => {
    renderTable({ rows: [], total: 0 })
    expect(screen.getByText('0 of 0 positions')).toBeInTheDocument()
    expect(screen.getByText('No positions.')).toBeInTheDocument()
  })
})
