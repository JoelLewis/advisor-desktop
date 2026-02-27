import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '../DataTable'
import type { ColumnDef } from '@tanstack/react-table'

type TestRow = { id: string; name: string; value: number }

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
]

const data: TestRow[] = [
  { id: '1', name: 'Alpha', value: 100 },
  { id: '2', name: 'Beta', value: 200 },
  { id: '3', name: 'Gamma', value: 300 },
]

describe('DataTable', () => {
  it('renders header row with column names', () => {
    render(<DataTable data={data} columns={columns} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
  })

  it('renders correct number of data rows', () => {
    render(<DataTable data={data} columns={columns} />)

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()

    // 3 body rows + 1 header row = 4 total rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4)
  })

  it('shows emptyMessage when data is empty', () => {
    render(
      <DataTable data={[]} columns={columns} emptyMessage="No records found" />,
    )

    expect(screen.getByText('No records found')).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<DataTable data={data} columns={columns} onRowClick={onRowClick} />)

    const alphaCell = screen.getByText('Alpha')
    await user.click(alphaCell.closest('tr')!)

    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', name: 'Alpha', value: 100 }),
    )
  })

  it('filters rows when searchValue is provided with searchColumn', () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        searchValue="Beta"
        searchColumn="name"
      />,
    )

    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
  })

  it('toggles sort when clicking a column header', async () => {
    const user = userEvent.setup()
    render(<DataTable data={data} columns={columns} />)

    // Initial order: Alpha, Beta, Gamma (insertion order)
    const rows = () => screen.getAllByRole('row').slice(1) // skip header
    const firstCellText = () => rows()[0]?.querySelector('td')?.textContent

    expect(firstCellText()).toBe('Alpha')

    // Click "Name" header to sort ascending
    const nameHeader = screen.getByText('Name').closest('th')!
    await user.click(nameHeader)

    // Ascending: Alpha, Beta, Gamma (same as original alphabetical)
    expect(firstCellText()).toBe('Alpha')

    // Click again to sort descending
    await user.click(nameHeader)

    // Descending: Gamma, Beta, Alpha
    expect(firstCellText()).toBe('Gamma')
  })
})
