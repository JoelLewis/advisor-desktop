import { describe, it, expect } from 'vitest'
import { computeEstimatedValue } from '../shared'

// Important fix round 3 · pre-trade-compliance — this fix (extracting one shared notional
// formula so `SingleTradeView`, `TradeTicketDialog` and `OrderSummaryCard` all read the same
// number) shipped with zero direct tests in fix round 2, and the review found five mutations
// that survived the full suite: reverting the call site to `quantity * price`, and dropping the
// option contract multiplier, the bond par amount, the fund dollar amount, and the yield-mode
// price fix. These tests pin the formula itself with literal expected numbers (not a derived
// re-statement of the formula, which a mutation could share the bug with).
describe('computeEstimatedValue', () => {
  it('option: quantity x premium x contract multiplier (100 contracts per option, not 1)', () => {
    // The review's own repro: 5,000 contracts at an $8.50 premium.
    expect(computeEstimatedValue({ assetClass: 'option', quantity: 5_000, price: 8.50 })).toBe(4_250_000)
  })

  it('option: an explicit contract multiplier overrides the 100-contract default', () => {
    expect(computeEstimatedValue({ assetClass: 'option', quantity: 10, price: 2, contractMultiplier: 10 })).toBe(200)
  })

  it('fixed_income: par amount defaults to quantity x $1,000, priced per $100 of par', () => {
    // The review's own repro: 2,000 bonds ($1,000 par each) at a 99.45 clean price.
    expect(computeEstimatedValue({ assetClass: 'fixed_income', quantity: 2_000, price: 99.45 })).toBe(1_989_000)
  })

  it('fixed_income: an explicit par amount overrides the quantity x $1,000 default', () => {
    expect(computeEstimatedValue({ assetClass: 'fixed_income', quantity: 50, price: 95.25, parAmount: 50_000 })).toBe(47_625)
  })

  it('mutual_fund: a dollar-amount purchase uses the dollar amount, not quantity x NAV', () => {
    expect(computeEstimatedValue({ assetClass: 'mutual_fund', quantity: 1, price: 465.32, dollarAmount: 25_000 })).toBe(25_000)
  })

  it('mutual_fund: a share-based purchase (no dollar amount) uses quantity x NAV', () => {
    expect(computeEstimatedValue({ assetClass: 'mutual_fund', quantity: 100, price: 465.32 })).toBeCloseTo(46_532, 5)
  })

  it('digital_asset and equity: quantity x price, with no multiplier or par adjustment', () => {
    expect(computeEstimatedValue({ assetClass: 'digital_asset', quantity: 0.25, price: 87_450 })).toBeCloseTo(21_862.5, 5)
    expect(computeEstimatedValue({ assetClass: 'equity', quantity: 500, price: 195.40 })).toBeCloseTo(97_700, 5)
  })
})
