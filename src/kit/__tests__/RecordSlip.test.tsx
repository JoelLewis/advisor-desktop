import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordSlip } from '@/kit/record-slip/RecordSlip'

const recordedBy = { name: 'Adrian Hale', role: 'Advisor of record' }

it('shows the kind, who, role, when in Eastern Time and the archive status', () => {
  render(<RecordSlip kind="Approval · sign-off" title="Rebalance approved" recordedBy={recordedBy} at="2026-02-25T12:07:00Z" archive="Non-rewritable · supervisory review" />)
  expect(screen.getByRole('article', { name: 'Rebalance approved' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Rebalance approved' })).toBeInTheDocument()
  for (const t of ['Approval · sign-off', 'Adrian Hale, Advisor of record', '25 Feb 07:07 ET', 'Non-rewritable · supervisory review']) {
    expect(screen.getByText(t)).toBeInTheDocument()
  }
})

it('folds the record ID, UTC and fingerprint under Audit details', () => {
  render(<RecordSlip kind="Approval" title="Approved v3" audit={{ recordId: 'REC-222EF522', fingerprint: 'AAA22E77' }} recordedBy={recordedBy} at="2026-02-25T12:07:00Z" archive="Archive" />)
  const audit = screen.getByText('Audit details').closest('details')!
  expect(audit).not.toHaveAttribute('open')
  for (const t of ['REC-222EF522', 'AAA22E77', '2026-02-25 12:07 UTC']) expect(audit).toHaveTextContent(t)
})

it('has no Audit details when none is given', () => {
  render(<RecordSlip kind="Message from Adrian Hale" title="Sent to you" recordedBy={recordedBy} at="2026-02-25T12:07:00Z" archive="Retained as a record" />)
  expect(screen.queryByText('Audit details')).not.toBeInTheDocument()
  expect(screen.queryByText(/UTC/)).not.toBeInTheDocument()
})
