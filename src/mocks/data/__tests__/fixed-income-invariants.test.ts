import { describe, it, expect } from 'vitest'
import { fixedIncomeSymbols } from '@/mocks/data/trading'

/**
 * C21 — yield-to-worst is the lower of yield-to-maturity and yield-to-call across a bond's call
 * schedule, and equals YTM only for a genuinely non-callable bond. No call schedule is modeled
 * in these fixtures, so `yieldToWorst` is omitted entirely rather than restated as a copy of
 * `yieldToMaturity` — that restatement was exactly the defect this fixed (every instrument,
 * including three long-dated callable municipals, previously quoted YTW === YTM).
 *
 * `bond-math.test.ts` proves the pure functions in `@/lib/bond-math` invert correctly; nothing
 * there guards against the fixture map in `trading.ts` reintroducing the duplicate at the call
 * site. These tests are that guard — they fail by naming the offending bond if `yieldToWorst` is
 * ever added back as a copy of `yieldToMaturity`, or if it is ever set above it.
 */
describe('fixed-income fixture invariants', () => {
  it('every fixed-income fixture has a yieldToMaturity', () => {
    for (const bond of fixedIncomeSymbols) {
      expect(bond.yieldToMaturity, `${bond.symbol} is missing yieldToMaturity`).toBeTypeOf('number')
    }
  })

  it('no bond states a yieldToWorst equal to its yieldToMaturity (the reintroduced-defect signature)', () => {
    for (const bond of fixedIncomeSymbols) {
      if (bond.yieldToWorst == null) continue
      expect(bond.yieldToWorst, `${bond.symbol} publishes yieldToWorst === yieldToMaturity`).not.toBe(
        bond.yieldToMaturity,
      )
    }
  })

  it('yieldToWorst, whenever published, is never above yieldToMaturity', () => {
    for (const bond of fixedIncomeSymbols) {
      if (bond.yieldToWorst == null) continue
      expect(bond.yieldToWorst, `${bond.symbol} yieldToWorst exceeds yieldToMaturity`).toBeLessThanOrEqual(
        bond.yieldToMaturity!,
      )
    }
  })
})
