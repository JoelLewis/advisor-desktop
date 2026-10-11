import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { ModelTradeView } from '../ModelTradeView'
import { previewModelTrades } from '@/services/trading'
import { getDrift } from '@/services/pms'
import { getAccounts } from '@/services/custodian'
import { formatCurrency } from '@/lib/utils'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'

/**
 * Task 9 · Step 7 — render the real component, not a replica.
 *
 * Task 4 shipped two tests that proved a formula while nothing proved the component called it, and
 * both mutations survived until a real render test existed. `model-trade-invariants` proves the
 * handler derives the preview; these prove `ModelTradeView` displays what it is given — the
 * account's real name, its real drift on both steps of the wizard, the derived reason, and each
 * notional converted from the trade's own currency rather than read as dollars.
 *
 * The display settings mock has `compactNumbers: true` and the reporting currency is USD, so the
 * expected strings are built with `formatCurrency(…, { compact: true, currency: 'USD' })` — the
 * component passes no `compact` override at these call sites.
 */

/** The step-2 "Drift %" column used to be `id.charCodeAt(id.length - 1) % 5 + 1.2`. */
function fabricatedDrift(accountId: string): string {
  return `${((accountId.charCodeAt(accountId.length - 1) % 5) + 1.2).toFixed(1)}%`
}

async function openModel(user: ReturnType<typeof userEvent.setup>, modelName: string) {
  renderWithProviders(<ModelTradeView />)
  const card = await screen.findByText(modelName, { exact: true })
  await user.click(card)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  return screen.findByText(/accounts selected$/)
}

/** Deselect every account, then re-select just the one named — keeps the preview to one row. */
async function selectOnly(user: ReturnType<typeof userEvent.setup>, accountName: string) {
  const row = screen.getByText(accountName).closest('tr')!
  const header = screen.getAllByRole('checkbox')[0]!
  await user.click(header) // select-all toggle: everything is pre-selected, so this clears it
  await user.click(within(row).getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Preview Trades' }))
  return screen.findByText('Trade Preview')
}

// Each test walks the wizard over the full 47-account selection table (and two of them deselect,
// reselect and preview), ~0.7–0.8s apiece on an idle machine — the heaviest renders in the suite
// after SingleTradeView. 15s keeps a ~10x margin when other worktrees' suites share the CPU.
describe('ModelTradeView renders the account\'s own data, not a hash of its id', { timeout: 15_000 }, () => {
  it('step 2 shows each account\'s real drift, not the character-code figure', async () => {
    const user = userEvent.setup()
    await openModel(user, 'Growth')

    const drift = await getDrift('acc-041')
    const real = `${(drift.maxAbsDrift * 100).toFixed(1)}%`
    const row = screen.getByText('Chen-Wong HK Equity Account').closest('tr')!

    // acc-041 is 79.4% adrift; the old formula could only ever emit 1.2–5.2, and for this id, 5.2.
    expect(real).not.toBe(fabricatedDrift('acc-041'))
    expect(within(row).getByText(real)).toBeInTheDocument()
    expect(within(row).queryByText(fabricatedDrift('acc-041'))).not.toBeInTheDocument()
  })

  it('step 2 renders each account\'s value in its own currency — acc-041 (HKD) converted, acc-002 (USD) untouched', async () => {
    const user = userEvent.setup()
    await openModel(user, 'Growth')

    const accounts = await getAccounts()
    const hk = accounts.find((a) => a.id === 'acc-041')!
    const us = accounts.find((a) => a.id === 'acc-002')!
    expect(hk.baseCurrency).toBe('HKD')
    expect(us.baseCurrency).toBeUndefined()

    // HKD row: the converted figure, never the raw HK$ number wearing a dollar sign. `CurrencyValue`
    // defaults `from` to USD, so an omitted prop renders HK$12,500,000 as "$12,500,000".
    const converted = formatCurrency(
      convertCurrency(hk.totalValue, 'HKD', 'USD', FX_RATES_USD_BASE),
      { compact: true, currency: 'USD' },
    )
    const unconverted = formatCurrency(hk.totalValue, { compact: true, currency: 'USD' })
    expect(converted).not.toBe(unconverted)
    const hkRow = screen.getByText(hk.name).closest('tr')!
    expect(within(hkRow).getByText(converted)).toBeInTheDocument()
    expect(within(hkRow).queryByText(unconverted)).not.toBeInTheDocument()

    // USD control — the point of the pair. A row that converts *unconditionally* (a hardcoded
    // `from="HKD"`, say) would satisfy the assertion above and fail here, so "passes" cannot mean
    // "converts everything".
    const usRow = screen.getByText(us.name).closest('tr')!
    expect(within(usRow).getByText(formatCurrency(us.totalValue, { compact: true, currency: 'USD' }))).toBeInTheDocument()
    expect(within(usRow).queryByText(
      formatCurrency(convertCurrency(us.totalValue, 'HKD', 'USD', FX_RATES_USD_BASE), { compact: true, currency: 'USD' }),
    )).not.toBeInTheDocument()
  })

  it('acc-041 (HKD): the preview names the account, quotes its own drift and reasons, and converts its notionals', async () => {
    const user = userEvent.setup()
    await openModel(user, 'Growth')
    await selectOnly(user, 'Chen-Wong HK Equity Account')

    const [preview] = await previewModelTrades('mod-002', ['acc-041'])
    expect(preview!.currency).toBe('HKD')
    expect(preview!.trades.length).toBeGreaterThan(0)

    // ── the account's real name, not `Account acc-041` ──
    expect(screen.getByText('Chen-Wong HK Equity Account')).toBeInTheDocument()
    expect(screen.queryByText('Account acc-041')).not.toBeInTheDocument()

    // ── its own drift, on the preview header ──
    expect(screen.getByText(`Drift: ${preview!.currentDrift.toFixed(1)}%`)).toBeInTheDocument()

    // ── the derived reason, with this account's own weights ──
    const sell = preview!.trades.find((t) => t.side === 'sell')!
    expect(sell.reason).toMatch(/^Reduce .* against a .*% target$/)
    expect(screen.getAllByText(sell.reason).length).toBeGreaterThan(0)
    expect(screen.queryByText('Reduce US Equity overweight from 47% to 42%')).not.toBeInTheDocument()

    // ── §9.3 · each notional converted from HKD, not the raw HKD number formatted as dollars ──
    const biggest = [...preview!.trades].sort((a, b) => b.estimatedValue - a.estimatedValue)[0]!
    const converted = formatCurrency(
      convertCurrency(biggest.estimatedValue, 'HKD', 'USD', FX_RATES_USD_BASE),
      { compact: true, currency: 'USD' },
    )
    const mislabeled = formatCurrency(biggest.estimatedValue, { compact: true, currency: 'USD' })
    // The two strings must be distinguishable, or this assertion cannot tell them apart.
    expect(converted).not.toBe(mislabeled)
    expect(screen.getAllByText(converted).length).toBeGreaterThan(0)
    expect(screen.queryByText(mislabeled)).not.toBeInTheDocument()

    // ── and the tax figure on the same header row is converted too ──
    const convertedTax = formatCurrency(
      convertCurrency(preview!.estimatedTaxImpact, 'HKD', 'USD', FX_RATES_USD_BASE),
      { compact: true, currency: 'USD' },
    )
    expect(preview!.estimatedTaxImpact).toBeGreaterThan(0)
    expect(screen.getByText(`Est. tax, net of losses: ${convertedTax}`)).toBeInTheDocument()

    // ── the batch summary cards convert before summing ──
    // With one HKD preview selected, the "Total Value" and "Est. Tax Impact" cards are that
    // preview's own totals converted to USD; summing the raw HKD figures and labelling them '$'
    // would overstate both by the 7.82 HKD/USD rate.
    const rawTotal = preview!.trades.reduce((s, t) => s + t.estimatedValue, 0)
    const expectedTotal = formatCurrency(
      convertCurrency(rawTotal, 'HKD', 'USD', FX_RATES_USD_BASE),
      { compact: true, currency: 'USD' },
    )
    const unconvertedTotal = formatCurrency(rawTotal, { compact: true, currency: 'USD' })
    expect(expectedTotal).not.toBe(unconvertedTotal)
    expect(screen.getAllByText(expectedTotal).length).toBeGreaterThan(0)
    expect(screen.queryByText(unconvertedTotal)).not.toBeInTheDocument()
    expect(screen.getAllByText(convertedTax).length).toBeGreaterThan(0)
    // The card adds separately netted account figures, so it says so.
    expect(screen.getByText('Est. tax, sum of account estimates')).toBeInTheDocument()

    // ── the hardcoded basket is gone ──
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })

  it('acc-001 (USD): the already-correct case is unchanged, and the model asked for is named', async () => {
    const user = userEvent.setup()
    // acc-001 is on mod-001, whose real name is 'Balanced Growth' — never 'Growth Balanced'.
    await openModel(user, 'Balanced Growth')
    expect(screen.getByText(/Accounts assigned to Balanced Growth/)).toBeInTheDocument()
    await selectOnly(user, 'Johnson Family Trust')

    const [preview] = await previewModelTrades('mod-001', ['acc-001'])
    expect(preview!.currency).toBe('USD')
    const trade = preview!.trades[0]!
    // USD -> USD is a no-op, so the rendered figure is the raw notional formatted.
    expect(screen.getAllByText(formatCurrency(trade.estimatedValue, { compact: true, currency: 'USD' })).length)
      .toBeGreaterThan(0)
    expect(screen.getByText('Johnson Family Trust')).toBeInTheDocument()
  })
})
