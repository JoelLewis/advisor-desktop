import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/kit/checkbox/Checkbox'

it('is a labeled checkbox that reports its new state', async () => {
  const onChange = vi.fn()
  render(<Checkbox label="Harvest only" checked={false} onChange={onChange} />)
  await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Harvest only' }))
  expect(onChange).toHaveBeenCalledWith(true)
})

it('cannot be changed while disabled', async () => {
  const onChange = vi.fn()
  render(<Checkbox label="Harvest only" checked={false} onChange={onChange} disabled />)
  const box = screen.getByRole('checkbox', { name: 'Harvest only' })
  expect(box).toBeDisabled()
  await userEvent.setup().click(box)
  expect(onChange).not.toHaveBeenCalled()
})

it('is described by the element it names', () => {
  render(<><p id="why">Sells only lots at a loss.</p><Checkbox label="Harvest only" checked onChange={() => {}} describedBy="why" /></>)
  const box = screen.getByRole('checkbox', { name: 'Harvest only' })
  expect(box).toBeChecked()
  expect(box).toHaveAccessibleDescription('Sells only lots at a loss.')
})
