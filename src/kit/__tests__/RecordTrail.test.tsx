import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RecordTrail } from '@/kit/record-trail/RecordTrail'

it('lists ordered steps with state and actor', () => {
  render(<RecordTrail steps={[
    { label: 'Plan signed', actor: 'Joel Lewis', state: 'DONE', at: '2026-02-25T12:03:00Z' },
    { label: 'Exception review of SPY, EFA', actor: 'Mark Davis', state: 'PENDING' },
    { label: 'Release to the custodian', actor: 'Trading', state: 'NOT STARTED' },
  ]} />)
  const items = within(screen.getByRole('list', { name: 'Record trail' })).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(within(items[1]!).getByText('PENDING')).toBeInTheDocument()
  expect(items[1]).toHaveTextContent('Not yet recorded')
  expect(within(items[0]!).getByText('2026-02-25 12:03 UTC')).toBeInTheDocument()
})
