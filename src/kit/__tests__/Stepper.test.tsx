import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Stepper } from '@/kit/stepper/Stepper'

it('lists steps with their states and marks the current one', () => {
  render(
    <Stepper label="Rebalance this account" currentId="approve" steps={[
      { id: 'drift', label: 'Drift and lots', state: 'DONE' },
      { id: 'approve', label: 'Approve', state: 'OPEN' },
      { id: 'message', label: 'Client message', state: 'DRAFT' },
    ]} />,
  )
  const list = screen.getByRole('list', { name: 'Rebalance this account' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items[1]).toHaveAttribute('aria-current', 'step')
  expect(within(items[2]!).getByText('DRAFT')).toBeInTheDocument()
})
