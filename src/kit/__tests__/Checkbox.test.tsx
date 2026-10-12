import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/kit/checkbox/Checkbox'

it('is a labelled checkbox that reports its new state', async () => {
  const onChange = vi.fn()
  render(<Checkbox label="Harvest only" checked={false} onChange={onChange} />)
  await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Harvest only' }))
  expect(onChange).toHaveBeenCalledWith(true)
})
