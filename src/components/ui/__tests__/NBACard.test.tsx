import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { NBACard } from '../NBACard'
import type { NBA } from '@/types/nba'

function createTestNBA(overrides: Partial<NBA> = {}): NBA {
  return {
    id: 'nba-test-001',
    title: 'Rebalance Large Cap Growth accounts',
    description: 'Multiple accounts have drifted beyond the 5% threshold in US Large Cap Growth allocation.',
    category: 'rebalancing',
    priority: 'critical',
    scoring: {
      urgency: 65,
      impact: 80,
      efficiency: 70,
      relationship: 50,
      confidence: 85,
      composite: 72,
    },
    clients: [
      { id: 'c1', name: 'Sarah Johnson' },
      { id: 'c2', name: 'Michael Chen' },
    ],
    trigger: {
      source: 'PMS',
      condition: 'drift_exceeded',
      value: '7.2%',
      detectedAt: '2026-02-24T10:00:00Z',
    },
    suggestedAction: 'Execute rebalance trades',
    estimatedImpact: 45000,
    createdAt: '2026-02-24T10:00:00Z',
    dismissed: false,
    ...overrides,
  }
}

describe('NBACard', () => {
  it('renders title and description', () => {
    const nba = createTestNBA()
    renderWithProviders(<NBACard nba={nba} />)

    expect(screen.getByText('Rebalance Large Cap Growth accounts')).toBeInTheDocument()
    expect(screen.getByText(/Multiple accounts have drifted/)).toBeInTheDocument()
  })

  it('renders category badge text', () => {
    const nba = createTestNBA({ category: 'rebalancing' })
    renderWithProviders(<NBACard nba={nba} />)

    expect(screen.getByText('Rebalancing')).toBeInTheDocument()
  })

  it('renders priority label', () => {
    const nba = createTestNBA({ priority: 'critical' })
    renderWithProviders(<NBACard nba={nba} />)

    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders urgency badge based on scoring.urgency', () => {
    // urgency=65 maps to "This Week" (>60 and <=80)
    const nba = createTestNBA({
      scoring: { urgency: 65, impact: 80, efficiency: 70, relationship: 50, confidence: 85, composite: 72 },
    })
    renderWithProviders(<NBACard nba={nba} />)

    expect(screen.getByText('This Week')).toBeInTheDocument()
  })

  it('renders client name chips', () => {
    const nba = createTestNBA({
      clients: [
        { id: 'c1', name: 'Sarah Johnson' },
        { id: 'c2', name: 'Michael Chen' },
      ],
    })
    renderWithProviders(<NBACard nba={nba} />)

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.getByText('Michael Chen')).toBeInTheDocument()
  })

  it('calls onAction when the primary action button is clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const nba = createTestNBA()
    renderWithProviders(<NBACard nba={nba} onAction={onAction} />)

    const actionButton = screen.getByRole('button', { name: /Rebalance/i })
    await user.click(actionButton)

    expect(onAction).toHaveBeenCalledWith('nba-test-001')
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    const nba = createTestNBA()
    renderWithProviders(<NBACard nba={nba} onDismiss={onDismiss} />)

    const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
    await user.click(dismissButton)

    expect(onDismiss).toHaveBeenCalledWith('nba-test-001')
  })

  it('shows "Non-Dismissible" for compliance NBAs with nonDismissible=true', () => {
    const nba = createTestNBA({
      category: 'compliance',
      complianceInfo: {
        nonDismissible: true,
        escalationLevel: 'advisor',
        supervisorOverride: false,
        auditTrail: [
          { action: 'created', timestamp: '2026-02-24T10:00:00Z', actor: 'system' },
        ],
      },
    })
    renderWithProviders(<NBACard nba={nba} />)

    expect(screen.getByText('Non-Dismissible')).toBeInTheDocument()
    // The Dismiss button should not be present
    expect(screen.queryByRole('button', { name: /Dismiss/i })).not.toBeInTheDocument()
  })
})
