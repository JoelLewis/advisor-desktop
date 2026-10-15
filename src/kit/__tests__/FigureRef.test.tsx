import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FigureRef } from '@/kit/figure-ref/FigureRef'

it('is focusable and describes its source by name, keeping the engine path as data', () => {
  render(<p>Tax of about <FigureRef source="Rebalance preview · estimated tax" path="rebalance.estimatedTaxImpact" note={3}>$18,216</FigureRef>.</p>)
  const fig = screen.getByRole('group', { name: '$18,216' })
  expect(fig).toHaveAttribute('data-figure')
  expect(fig).toHaveAttribute('tabindex', '0')
  expect(fig).toHaveAccessibleDescription('Source: Rebalance preview · estimated tax')
  expect(fig).toHaveAttribute('data-source', 'rebalance.estimatedTaxImpact')
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByText('note')).toBeInTheDocument()
})

it('opens the source tooltip on keyboard focus', async () => {
  render(<FigureRef source="Rebalance preview · estimated tax">$18,216</FigureRef>)
  await userEvent.tab()
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Source: Rebalance preview · estimated tax')
})

it('gives each instance its own description id', () => {
  render(<p><FigureRef source="a.b">$1</FigureRef><FigureRef source="c.d">$2</FigureRef></p>)
  const first = screen.getByRole('group', { name: '$1' })
  const second = screen.getByRole('group', { name: '$2' })
  expect(first.getAttribute('aria-describedby')).not.toBe(second.getAttribute('aria-describedby'))
  expect(second).toHaveAccessibleDescription('Source: c.d')
})
