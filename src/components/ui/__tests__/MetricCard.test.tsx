import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../MetricCard'

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Total AUM" value="$12.4M" />)

    expect(screen.getByText('Total AUM')).toBeInTheDocument()
    expect(screen.getByText('$12.4M')).toBeInTheDocument()
  })

  it('renders change value when provided', () => {
    render(
      <MetricCard
        label="Total AUM"
        value="$12.4M"
        change={{ value: '+2.3%', direction: 'up' }}
      />,
    )

    expect(screen.getByText('+2.3%')).toBeInTheDocument()
  })

  it('applies green styling for up direction', () => {
    render(
      <MetricCard
        label="Revenue"
        value="$500K"
        change={{ value: '+5.1%', direction: 'up' }}
      />,
    )

    const changeEl = screen.getByText('+5.1%').closest('div')
    expect(changeEl?.className).toContain('text-accent-green')
  })

  it('does not render change section when change prop is omitted', () => {
    const { container } = render(<MetricCard label="Accounts" value="42" />)

    // The change div (with direction styling) should not exist
    expect(container.querySelector('.text-accent-green')).toBeNull()
    expect(container.querySelector('.text-accent-red')).toBeNull()
    expect(container.querySelector('.text-text-tertiary')).toBeNull()
  })
})
