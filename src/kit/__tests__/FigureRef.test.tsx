import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FigureRef } from '@/kit/figure-ref/FigureRef'

it('is focusable and describes its engine source', () => {
  render(<p>Tax of about <FigureRef source="rebalance.estimatedTaxImpact" note={3}>$18,216</FigureRef>.</p>)
  const fig = screen.getByText('$18,216').closest('[data-figure]') as HTMLElement
  expect(fig).toHaveAttribute('tabindex', '0')
  expect(fig).toHaveAccessibleDescription('Source: rebalance.estimatedTaxImpact')
  expect(screen.getByText('3')).toBeInTheDocument()
})
