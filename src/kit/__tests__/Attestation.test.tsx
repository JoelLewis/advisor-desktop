import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Attestation } from '@/kit/attestation/Attestation'

it('is a labelled checkbox that reports its new state', async () => {
  const onChange = vi.fn()
  render(<Attestation id="a1" checked={false} onChange={onChange}>I reviewed every leg.</Attestation>)
  await userEvent.click(screen.getByRole('checkbox', { name: 'I reviewed every leg.' }))
  expect(onChange).toHaveBeenCalledWith(true)
})
