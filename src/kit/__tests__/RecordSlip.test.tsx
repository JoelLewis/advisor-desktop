import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordSlip } from '@/kit/record-slip/RecordSlip'

it('shows who, role, when, record ID and archive status', () => {
  render(<RecordSlip kind="Approval · binding" title="Rebalance approved" recordId="REC-222EF522" fingerprint="AAA22E77"
    recordedBy={{ name: 'Joel Lewis', role: 'Advisor of record' }} at="2026-02-25T12:03:00Z" archive="Non-rewritable · supervisory review" />)
  expect(screen.getByRole('article', { name: 'Rebalance approved' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Rebalance approved' })).toBeInTheDocument()
  for (const t of ['REC-222EF522', 'AAA22E77', 'Joel Lewis, Advisor of record', '2026-02-25 12:03 UTC', 'Non-rewritable · supervisory review']) {
    expect(screen.getByText(t)).toBeInTheDocument()
  }
})
