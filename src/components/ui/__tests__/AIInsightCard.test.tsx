import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { AIInsightCard, AIInsightStack } from '../AIInsightCard'
import type { AIInsight } from '@/types/ai'

function createTestInsight(overrides: Partial<AIInsight> = {}): AIInsight {
  return {
    id: 'insight-001',
    severity: 'info',
    title: 'Portfolio Concentration Risk',
    body: 'Top 5 holdings represent 62% of total portfolio value, exceeding the 50% guideline.',
    ...overrides,
  }
}

describe('AIInsightCard', () => {
  it('renders title and body text', () => {
    const insight = createTestInsight()
    renderWithProviders(<AIInsightCard insight={insight} />)

    expect(screen.getByText('Portfolio Concentration Risk')).toBeInTheDocument()
    expect(screen.getByText(/Top 5 holdings represent 62%/)).toBeInTheDocument()
  })

  it('renders metric when provided', () => {
    const insight = createTestInsight({
      metric: { label: 'HHI Score', value: '2,450' },
    })
    renderWithProviders(<AIInsightCard insight={insight} />)

    expect(screen.getByText(/HHI Score/)).toBeInTheDocument()
    expect(screen.getByText(/2,450/)).toBeInTheDocument()
  })

  it('renders action button with actionLabel text when actionRoute is set', () => {
    const insight = createTestInsight({
      actionLabel: 'View Risk Analysis',
      actionRoute: '/portfolios/risk',
    })
    renderWithProviders(<AIInsightCard insight={insight} />)

    expect(screen.getByRole('button', { name: /View Risk Analysis/i })).toBeInTheDocument()
  })

  it('does not render action button when no actionLabel', () => {
    const insight = createTestInsight({
      actionRoute: '/portfolios/risk',
      // no actionLabel
    })
    renderWithProviders(<AIInsightCard insight={insight} />)

    // There should be no button in the card at all
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not render action button when actionLabel is set but no actionRoute or actionAI', () => {
    const insight = createTestInsight({
      actionLabel: 'View Details',
      // no actionRoute, no actionAI
    })
    renderWithProviders(<AIInsightCard insight={insight} />)

    expect(screen.queryByRole('button', { name: /View Details/i })).not.toBeInTheDocument()
  })
})

describe('AIInsightStack', () => {
  it('renders multiple insight cards', () => {
    const insights: AIInsight[] = [
      createTestInsight({ id: 'i1', title: 'Insight Alpha' }),
      createTestInsight({ id: 'i2', title: 'Insight Beta' }),
      createTestInsight({ id: 'i3', title: 'Insight Gamma' }),
    ]
    renderWithProviders(<AIInsightStack insights={insights} />)

    expect(screen.getByText('Insight Alpha')).toBeInTheDocument()
    expect(screen.getByText('Insight Beta')).toBeInTheDocument()
    expect(screen.getByText('Insight Gamma')).toBeInTheDocument()
  })

  it('renders nothing when insights array is empty', () => {
    const { container } = renderWithProviders(<AIInsightStack insights={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
