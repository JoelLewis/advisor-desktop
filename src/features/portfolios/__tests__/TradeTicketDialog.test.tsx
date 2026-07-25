import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { TradeTicketDialog } from '../TradeTicketDialog'

/**
 * Minor fix round 3 · pre-trade-compliance — `priceUnavailable` is the only guard against
 * submitting a trade for which no pre-trade check ever ran (no known price means the debounced
 * effect returns early without calling `preCheck.mutate` at all, so `compliancePassed` stays
 * `null` — the button's other disable condition, `compliancePassed === false`, never fires for a
 * check that never happened). Without this test, dropping the guard from the submit button's
 * `disabled` expression would pass the full suite silently.
 */
describe('TradeTicketDialog — priceUnavailable blocks submission when no pre-trade check has run', () => {
  it('a symbol with no quote and no prefill price disables submit, rather than allowing an unchecked order', async () => {
    const user = userEvent.setup()
    // VTI has no entry in the quote-search fixture (trading.ts) — confirmed by C28's own fix
    // round 2 finding — and no prefill.price is supplied here, so the dialog cannot resolve any
    // price for it at all.
    renderWithProviders(
      <TradeTicketDialog
        open
        onClose={() => {}}
        accountId="acc-001"
        accountName="Johnson Family Trust"
        prefill={{ symbol: 'VTI', side: 'buy', assetClass: 'equity' }}
      />,
    )

    const qtyInput = await screen.findByLabelText('Quantity (shares)')
    await user.clear(qtyInput)
    await user.type(qtyInput, '100')

    expect(await screen.findByText(/No price available for VTI/i)).toBeInTheDocument()
    const submitButton = screen.getByRole('button', { name: /Price required/i })
    expect(submitButton).toBeDisabled()
  })
})
