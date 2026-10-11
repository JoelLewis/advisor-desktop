import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stamp } from '@/kit/stamp/Stamp'

it('approved and awaiting differ by shape and words, not colour', () => {
  const { rerender } = render(<Stamp state="awaiting" person="Adrian Hale" role="Advisor of record" />)
  expect(screen.getByRole('status')).toHaveTextContent('AWAITING YOUR SIGNATURE')
  expect(screen.getByText('AWAITING YOUR SIGNATURE')).toHaveAttribute('data-stamp', 'awaiting')
  rerender(<Stamp state="approved" person="Adrian Hale" role="Advisor of record" at="2026-02-25T12:03:00Z" />)
  expect(screen.getByText('APPROVED')).toHaveAttribute('data-stamp', 'approved')
  expect(screen.getByText('2026-02-25 12:03 UTC')).toBeInTheDocument()
})

it('an awaiting stamp may name no one', () => {
  render(<Stamp state="awaiting" />)
  expect(screen.getByRole('status')).toHaveTextContent(/^AWAITING YOUR SIGNATURE$/)
})

it('an approved stamp cannot omit who or when', () => {
  // @ts-expect-error approved requires `at`
  const missingAt = <Stamp state="approved" person="Adrian Hale" />
  // @ts-expect-error approved requires `person`
  const missingPerson = <Stamp state="approved" at="2026-02-25T12:03:00Z" />
  expect([missingAt, missingPerson]).toHaveLength(2)
})
