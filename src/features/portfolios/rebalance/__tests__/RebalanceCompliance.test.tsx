import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { RebalancePage } from '../../RebalancePage'

/**
 * The compliance step reads the proposal-level result (`evaluateProposal` behind
 * `/api/compliance/check-trades`). acc-002's tax-aware rebalance trims SPY from 44.8% to 36.1%
 * against a 35% fund limit and funds its buys from its own sales. Neither is a failure, so the
 * advisor can execute; SPY shows as a warning that the limit remains breached.
 */
describe('RebalancePage · compliance step on a multi-leg proposal', () => {
  it('acc-002: the SPY trim is a warning, not a failure, and Execute Rebalance is enabled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RebalancePage />, { initialEntries: ['/portfolios/rebalance?accounts=acc-002'] })

    const review = await screen.findByRole('button', { name: /Review Compliance/ }, { timeout: 5000 })
    await waitFor(() => expect(review).toBeEnabled())
    await user.click(review)

    await screen.findByText('Concentration limit: SPY', {}, { timeout: 5000 })
    expect(screen.getByText(/remains above the 35% pooled-vehicle limit/)).toBeInTheDocument()
    expect(screen.queryByText(/One or more compliance checks failed/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Execute Rebalance/ })).toBeEnabled()
  })
})
