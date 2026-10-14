import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { accounts as accountFixture } from '@/mocks/data/accounts'
import { deriveBookAUM } from '@/lib/aum'
import { convertToBase } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { isModelManaged } from '@/lib/mandate'

/**
 * §9.3 · currencies-and-fx — `oms.ts`'s rebalance trade generator derives every notional from
 * `account.totalValue`, which is native currency for the four non-USD accounts (acc-041 HKD,
 * acc-042 SGD, acc-043 EUR, acc-044 CHF — Global Constraint 5). `RebalancePreview` and
 * `ProposedTrade` now carry a `currency` tag so a consumer can convert correctly instead of
 * silently assuming USD.
 */
describe('§9.3 · rebalance previews carry their account currency', () => {
  it('acc-043 (EUR): proposed trades are tagged EUR, not USD', async () => {
    const [preview] = await previewRebalance('user-001', { accountIds: ['acc-043'], taxAware: true })
    expect(preview).toBeDefined()
    expect(preview!.currency).toBe('EUR')
    // Vacuity guard (Global Constraint 10) — assert there is something to check BEFORE asserting
    // every element satisfies a property; `.every()` is vacuously true on an empty array.
    expect(preview!.trades.length).toBeGreaterThan(0)
    expect(preview!.trades.every((t) => t.currency === 'EUR')).toBe(true)
  })

  it('acc-001 (USD) is still USD — the tag is read from the account, not hardcoded to the exotic case', async () => {
    const [preview] = await previewRebalance('user-001', { accountIds: ['acc-001'], taxAware: true })
    expect(preview).toBeDefined()
    expect(preview!.currency).toBe('USD')
    expect(preview!.trades.length).toBeGreaterThan(0)
    expect(preview!.trades.every((t) => t.currency === 'USD')).toBe(true)
  })

  it('all four non-USD accounts are tagged with their own currency', async () => {
    const expected = { 'acc-041': 'HKD', 'acc-042': 'SGD', 'acc-043': 'EUR', 'acc-044': 'CHF' } as const
    let sawATrade = false
    for (const [id, currency] of Object.entries(expected)) {
      // acc-041 and acc-042 are custom mandates: previewed onto Growth, as a migration onto a model would be.
      const onto = id === 'acc-041' || id === 'acc-042' ? { modelId: 'mod-002' } : {}
      const [preview] = await previewRebalance('user-001', { accountIds: [id], taxAware: true, ...onto })
      expect(preview, id).toBeDefined()
      expect(preview!.currency, id).toBe(currency)
      // §9.7 · all four now propose trades. acc-041 and acc-044 used to propose none — both are
      // cash-overweight, so the self-financing cap gave proceeds nowhere to go, and every sleeve
      // they were underweight was one they held nothing in, so there was nothing to buy either.
      // Model implementation securities close the second half of that, and the per-trade tag now
      // runs for every one of the four rather than only the two that happened to trade.
      expect(preview!.trades.length, `${id} must propose trades`).toBeGreaterThan(0)
      sawATrade = true
      expect(preview!.trades.every((t) => t.currency === currency), id).toBe(true)
    }
    // Vacuity guard for the loop as a whole (Global Constraint 10) — the per-trade assertion
    // above must actually have run.
    expect(sawATrade).toBe(true)
  })

  it('a preview carries its currency tag even for an account whose drift proposes no trades', async () => {
    // acc-004 (Patricia Johnson Roth IRA, $450K) is small and may not clear the default drift
    // threshold for every asset class — the point here is that the *tag* does not depend on
    // `trades` being non-empty, since `currencyForAccount` is resolved independently of the
    // trade-generation branch.
    const [preview] = await previewRebalance('user-001', { accountIds: ['acc-004'], taxAware: true, driftThreshold: 0.5 })
    expect(preview).toBeDefined()
    expect(preview!.currency).toBe('USD')
  })

  it('a mixed-currency batch total converts before summing', async () => {
    const previews = await previewRebalance('user-001', { accountIds: ['acc-001', 'acc-043'], taxAware: true })
    const naive = previews.reduce((s, p) => s + p.trades.reduce((t, x) => t + x.estimatedValue, 0), 0)
    const converted = previews.reduce(
      (s, p) => s + p.trades.reduce((t, x) => t + convertToBase(x.estimatedValue, p.currency, FX_RATES_USD_BASE), 0),
      0,
    )
    // EUR is not at parity in the fixtures (0.92 per the FX table), so these must differ
    // meaningfully — if they are equal, either the conversion is a no-op or acc-043 proposed
    // nothing, and both mean this test proves nothing (Global Constraint 10, restated for a sum).
    const eurPreview = previews.find((p) => p.currency === 'EUR')
    expect(eurPreview).toBeDefined()
    expect(eurPreview!.trades.length).toBeGreaterThan(0)
    expect(Math.abs(converted - naive)).toBeGreaterThan(1000)
  })

  it("a batch tax-impact total: converting each preview's own-currency figure before summing differs from summing them raw", async () => {
    // Mirrors the fix at RebalancePage.tsx's `totalTaxImpact` — proves the *right* aggregation
    // (convert each preview's own-currency `estimatedTaxImpact` before summing) is not
    // interchangeable with the naive one, using an account whose tax-unaware sells realize a
    // nonzero impact.
    const previews = await previewRebalance('user-001', { accountIds: ['acc-002', 'acc-043'], taxAware: false })
    const naiveTotal = previews.reduce((sum, p) => sum + p.estimatedTaxImpact, 0)
    const convertedTotal = previews.reduce(
      (sum, p) => sum + convertToBase(p.estimatedTaxImpact, p.currency, FX_RATES_USD_BASE),
      0,
    )
    const eurPreview = previews.find((p) => p.currency === 'EUR')
    expect(eurPreview).toBeDefined()
    expect(eurPreview!.estimatedTaxImpact).toBeGreaterThan(0)
    expect(Math.abs(convertedTotal - naiveTotal)).toBeGreaterThan(1000)
  })
})

describe('§9.3 · model AUM derivation uses deriveBookAUM, not a naive totalValue sum', () => {
  it('a model containing a non-USD account (mod-001: acc-043 EUR) reports AUM above the naive sum, at the converted value', async () => {
    // Phase 7a · C1: the HKD and SGD accounts are custom mandates now, on no model; Balanced Growth
    // holds the EUR account. EUR is 0.92 per USD, so converting a native-currency figure to USD
    // divides by less than one — the derived figure must be strictly **above** treating every
    // native amount as if it were already dollars, by exactly the EUR account's conversion.
    const accounts = accountFixture.filter(isModelManaged)
    const modelAccounts = accounts.filter((a) => a.modelId === 'mod-001')
    expect(modelAccounts.map((a) => a.baseCurrency ?? 'USD')).toContain('EUR')
    const naive = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)
    const derived = deriveBookAUM(modelAccounts, FX_RATES_USD_BASE)
    const eur = modelAccounts.find((a) => a.baseCurrency === 'EUR')!
    expect(derived).toBeGreaterThan(naive)
    expect(derived - naive).toBeCloseTo(eur.totalValue / 0.92 - eur.totalValue, 0)
  })

  it('a USD-only model (mod-006: 529 education accounts) reports the derived figure equal to the naive sum', async () => {
    const accounts = accountFixture.filter(isModelManaged)
    const modelAccounts = accounts.filter((a) => a.modelId === 'mod-006')
    expect(modelAccounts.length).toBeGreaterThan(0)
    expect(modelAccounts.every((a) => !a.baseCurrency || a.baseCurrency === 'USD')).toBe(true)
    const naive = modelAccounts.reduce((sum, a) => sum + a.totalValue, 0)
    const derived = deriveBookAUM(modelAccounts, FX_RATES_USD_BASE)
    // The mutation this guards against: a conversion applied unconditionally (rather than gated on
    // `baseCurrency !== 'USD'`) would corrupt this figure too, and only a USD-only control catches
    // that — the mod-001 test above cannot, since some difference is expected there either way.
    expect(derived).toBe(naive)
  })
})
