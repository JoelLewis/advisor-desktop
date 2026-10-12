import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberInput } from '@/kit/number-input/NumberInput'

it('is labelled with its unit, reports text, commits on Enter, and announces an error', async () => {
  const onChange = vi.fn()
  const onCommit = vi.fn()
  const { rerender } = render(<NumberInput label="Quantity" unit="sh" value="" onChange={onChange} onCommit={onCommit} />)
  const input = screen.getByRole('textbox', { name: 'Quantity sh' })
  expect(input).toHaveAttribute('inputmode', 'decimal')
  await userEvent.setup().type(input, '7{Enter}')
  expect(onChange).toHaveBeenCalledWith('7')
  expect(onCommit).toHaveBeenCalled()
  rerender(<NumberInput label="Quantity" unit="sh" value="0" onChange={onChange} error="The quantity must be positive." />)
  expect(screen.getByRole('textbox', { name: 'Quantity sh' })).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByRole('textbox', { name: 'Quantity sh' })).toHaveAccessibleDescription('The quantity must be positive.')
})

it('leaves Enter to submit the enclosing form when it has no commit of its own', async () => {
  const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
  render(<form onSubmit={onSubmit}><NumberInput label="Cap" unit="USD" value="5" onChange={() => {}} /></form>)
  await userEvent.setup().type(screen.getByRole('textbox', { name: 'Cap USD' }), '{Enter}')
  expect(onSubmit).toHaveBeenCalledOnce()
})
