import { it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioGroup } from '@/kit/radio-group/RadioGroup'

const OPTIONS = [{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }, { value: 'c', label: 'Third', disabled: true }] as const

it('is a named group of radios that reports the one chosen, described by what the choice rests on', async () => {
  const onChange = vi.fn()
  render(<><RadioGroup legend="Reason" options={OPTIONS} value="a" onChange={onChange} describedBy="why" /><p id="why">Because.</p></>)
  const group = screen.getByRole('group', { name: 'Reason' })
  expect(group).toHaveAccessibleDescription('Because.')
  expect(within(group).getByRole('radio', { name: 'First' })).toBeChecked()
  await userEvent.setup().click(within(group).getByRole('radio', { name: 'Second' }))
  expect(onChange).toHaveBeenCalledWith('b')
})

it('chooses nothing while its value is undefined, and a disabled radio cannot be chosen', async () => {
  const onChange = vi.fn()
  render(<RadioGroup legend="Reason" options={OPTIONS} value={undefined} onChange={onChange} />)
  expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false)
  await userEvent.setup().click(screen.getByRole('radio', { name: 'Third' }))
  expect(onChange).not.toHaveBeenCalled()
})
