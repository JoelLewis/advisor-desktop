import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '@/kit/select/Select'

const OPTIONS = [
  { value: 'user-001', label: 'Adrian Hale · Advisor' },
  { value: 'cli-001', label: 'Robert Johnson · Client' },
]

it('is a native select named by its visible label', () => {
  render(<Select label="View as" value="user-001" options={OPTIONS} onChange={() => {}} />)
  const select = screen.getByRole('combobox', { name: 'View as' })
  expect(select.tagName).toBe('SELECT')
  expect(screen.getByText('View as').tagName).toBe('LABEL')
  expect(select).toHaveValue('user-001')
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Adrian Hale · Advisor', 'Robert Johnson · Client'])
})

it('reports the chosen value', async () => {
  const onChange = vi.fn()
  render(<Select label="View as" value="user-001" options={OPTIONS} onChange={onChange} />)
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
  expect(onChange).toHaveBeenCalledExactlyOnceWith('cli-001')
})

it('can sit its label above the field, and announces an error', () => {
  render(<Select label="View as" layout="stacked" value="user-001" options={OPTIONS} onChange={() => {}} error="Choose someone else." />)
  const select = screen.getByRole('combobox', { name: 'View as' })
  expect(select).toHaveAttribute('aria-invalid', 'true')
  expect(select).toHaveAccessibleDescription('Choose someone else.')
})
