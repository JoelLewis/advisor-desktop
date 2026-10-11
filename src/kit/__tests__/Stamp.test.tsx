import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stamp } from '@/kit/stamp/Stamp'

it('approved and awaiting differ by shape and words, not colour', () => {
  const { rerender } = render(<Stamp state="awaiting" person="Joel Lewis" role="Advisor of record" />)
  expect(screen.getByRole('status')).toHaveTextContent('AWAITING YOUR SIGNATURE')
  expect(screen.getByText('AWAITING YOUR SIGNATURE')).toHaveAttribute('data-stamp', 'awaiting')
  rerender(<Stamp state="approved" person="Joel Lewis" role="Advisor of record" at="2026-02-25T12:03:00Z" />)
  expect(screen.getByText('APPROVED')).toHaveAttribute('data-stamp', 'approved')
  expect(screen.getByText('2026-02-25 12:03 UTC')).toBeInTheDocument()
})
