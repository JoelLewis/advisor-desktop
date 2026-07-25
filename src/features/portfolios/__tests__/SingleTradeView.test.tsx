import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { SingleTradeView } from '../SingleTradeView'

function renderView() {
  return renderWithProviders(<SingleTradeView />)
}

/**
 * Important fix round 3 · pre-trade-compliance — the review found this call site itself had zero
 * regression protection: reverting `SingleTradeView` to `getCurrentQuantity() * getCurrentPrice()`
 * (the original defect) passed the full suite, because no test exercised the actual UI wiring.
 * `trade-fields/__tests__/shared.test.ts` pins the formula; these pin that `SingleTradeView`
 * actually calls it, using a bond order sized so the *correct* notional blocks on compliance and
 * the *broken* one (quantity x price, or yield-as-price) passes clean — the same technique used
 * for the AccountDetailPage/TradeTicketDialog wiring test in fix round 2.
 */
describe('SingleTradeView — fixed-income notional wiring (fix round 3)', () => {
  async function placeBondOrder(user: ReturnType<typeof userEvent.setup>, { yieldMode }: { yieldMode: boolean }) {
    renderView()

    await user.click(screen.getByRole('button', { name: /Fixed Income/i }))

    const accountSelect = screen.getByLabelText('Account')
    await user.selectOptions(accountSelect, 'acc-001')

    const symbolInput = screen.getByLabelText('Symbol')
    await user.type(symbolInput, 'UST-2Y')
    const option = await screen.findByText('UST-2Y', {}, { timeout: 3000 })
    await user.click(option)

    const parInput = await screen.findByLabelText('Par Value ($1,000 increments)')
    await user.clear(parInput)
    // 2,000 bonds at $1,000 par each — the review's own repro.
    await user.type(parInput, '2000000')

    if (yieldMode) {
      await user.click(screen.getByRole('button', { name: /^YTM$/ }))
      const yieldInput = await screen.findByLabelText('Yield to Maturity (%)')
      await user.type(yieldInput, '4.35')
    }

    await user.click(screen.getByRole('button', { name: /Submit BUY Order/i }))
  }

  it('a $2M-par bond buy at a 99.45 clean price blocks — 24.3% of the $8.2M account against a 10% single-name limit', async () => {
    const user = userEvent.setup()
    await placeBondOrder(user, { yieldMode: false })

    // Correct: (2,000,000) x (99.45 / 100) = $1,989,000, 24.3% of acc-001 — blocked.
    // Broken (quantity x price): 2,000 x 99.45 = $198,900, 2.4% — passes clean.
    expect(await screen.findByText(/trade blocked/i, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })

  it('yield-to-maturity mode still blocks — the entered yield (4.35) is not used as if it were the price', async () => {
    const user = userEvent.setup()
    await placeBondOrder(user, { yieldMode: true })

    // Correct: falls back to the quoted clean price (99.45) — same $1,989,000, still blocked.
    // Broken (yield treated as price): 2,000,000 x (4.35/100) = $87,000, 1.1% — passes clean.
    expect(await screen.findByText(/trade blocked/i, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('All compliance checks passed')).not.toBeInTheDocument()
  })
})
