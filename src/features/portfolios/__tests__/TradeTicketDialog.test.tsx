import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { TradeTicketDialog } from '../TradeTicketDialog'

// Each test opens the Radix dialog, types into it and waits on the debounced pre-trade check —
// ~0.7s apiece on an idle machine, among the heaviest UI flows in the suite and one of the files
// that crossed the 5s default when other worktrees' suites shared the CPU. 15s keeps a ~10x margin.
const DIALOG_FLOW = { timeout: 15_000 }

/**
 * Minor fix round 3 · pre-trade-compliance — `priceUnavailable` is the only guard against
 * submitting a trade for which no pre-trade check ever ran (no known price means the debounced
 * effect returns early without calling `preCheck.mutate` at all, so `compliancePassed` stays
 * `null` — the button's other disable condition, `compliancePassed === false`, never fires for a
 * check that never happened). Without this test, dropping the guard from the submit button's
 * `disabled` expression would pass the full suite silently.
 */
describe('TradeTicketDialog — priceUnavailable blocks submission when no pre-trade check has run', DIALOG_FLOW, () => {
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

/**
 * Critical fix round 4 · pre-trade-compliance — round 3's fix (routing this dialog's notional
 * through `computeEstimatedValue` and pricing options off an entered premium rather than the
 * underlying's quote) shipped with **no regression protection on its own surface**. Three
 * mutations were run against the full 2,051-test suite and all three survived:
 *
 *   1. `computeEstimatedValue({...})`            -> `qty * effectivePrice`
 *   2. `Number(optionPremium) || 0`              -> `Number(optionPremium) || knownPrice`
 *   3. both together — the pre-round-3 source verbatim
 *
 * `trade-fields/__tests__/shared.test.ts` pins the *formula* and `SingleTradeView.test.tsx` pins
 * the *sibling* call site; nothing pinned that **this** dialog calls it. The existing
 * `AccountDetailPage.test.tsx` wiring test exercises only the equity path, where
 * `computeEstimatedValue` and `qty x price` are algebraically identical, so it can never
 * distinguish them.
 *
 * These use the same technique as `SingleTradeView.test.tsx`: drive the dialog with a non-equity
 * order sized so the *correct* notional blocks on compliance and every *broken* one passes
 * clean, then assert the block.
 */
describe('TradeTicketDialog — non-equity notional wiring (fix round 4)', DIALOG_FLOW, () => {
  it('a 2,000-bond UST-2Y buy blocks — $1,989,000 of par-adjusted notional, not the $198,900 that quantity x price would send', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <TradeTicketDialog
        open
        onClose={() => {}}
        accountId="acc-001"
        accountName="Johnson Family Trust"
        prefill={{ symbol: 'UST-2Y', side: 'buy', assetClass: 'fixed_income' }}
      />,
    )

    const qtyInput = await screen.findByLabelText(/Quantity \(bonds, par \$1,000 each\)/i)
    await user.clear(qtyInput)
    await user.type(qtyInput, '2000')

    // Correct: (2,000 x $1,000 par) x (99.45 / 100) = $1,989,000 — 24.3% of the $8.2M account
    // against a 10% single-name limit, and post-trade cash of -16.2%. Both block.
    // Broken (quantity x price): 2,000 x 99.45 = $198,900 — 2.4%, cash still positive, zero
    // violations, "All compliance checks passed".
    expect(await screen.findByText(/trade blocked/i, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })

  it('a 3,000-contract AAPL call at an $8.50 premium blocks — $2,550,000, not the premium without its multiplier nor the underlying share price', async () => {
    const user = userEvent.setup()
    // acc-006 (Chen Trust, $12M) holds no AAPL at all, so the whole projected weight is this
    // order — which makes the correct and broken notionals land on opposite sides of the limit
    // with room to spare, rather than a hair apart.
    renderWithProviders(
      <TradeTicketDialog
        open
        onClose={() => {}}
        accountId="acc-006"
        accountName="Chen Family Irrevocable Trust"
        prefill={{ symbol: 'AAPL', side: 'buy', assetClass: 'option' }}
      />,
    )

    const qtyInput = await screen.findByLabelText('Contracts')
    await user.clear(qtyInput)
    await user.type(qtyInput, '3000')

    const premiumInput = screen.getByLabelText('Premium (per contract)')
    await user.type(premiumInput, '8.50')

    // Correct: 3,000 x $8.50 x 100 = $2,550,000 — 21.3% against a 10% single-name limit, and
    // post-trade cash of -12.8%. Both block.
    // Broken (mutation 1, quantity x premium, no multiplier): 3,000 x 8.50 = $25,500 — 0.2%,
    // zero violations.
    // Broken (mutation 3, the pre-fix source verbatim — quantity x the *underlying's* quote):
    // 3,000 x $195.40 = $586,200 — 4.9%, cash still 3.6%, zero violations.
    expect(await screen.findByText(/trade blocked/i, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })

  it('an option with no premium entered blocks submission — the underlying\'s share price is not a premium', async () => {
    const user = userEvent.setup()
    // Mutation 2 (`Number(optionPremium) || knownPrice`) and the related `priceUnavailable`
    // mutation (`effectivePrice <= 0` -> `knownPrice <= 0`) both survive every other test,
    // because AAPL *does* have a quote — it is just the underlying's $195.40 share price, which
    // is not this contract's premium. With either mutation the dialog silently prices the order
    // off the underlying instead of blocking, so neither the message nor the disabled state
    // below appears.
    renderWithProviders(
      <TradeTicketDialog
        open
        onClose={() => {}}
        accountId="acc-006"
        accountName="Chen Family Irrevocable Trust"
        prefill={{ symbol: 'AAPL', side: 'buy', assetClass: 'option' }}
      />,
    )

    const qtyInput = await screen.findByLabelText('Contracts')
    await user.clear(qtyInput)
    await user.type(qtyInput, '3000')

    expect(await screen.findByText(/Enter a premium for AAPL to run the compliance check/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Price required/i })).toBeDisabled()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })
})
