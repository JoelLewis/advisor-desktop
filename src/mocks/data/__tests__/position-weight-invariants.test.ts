import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { allPositions, getPositionsForAccount } from '@/mocks/data/positions'

/**
 * Task 10 · the Phase 1 charter defect — a stored figure that duplicates a derivable one and
 * disagrees with it. `positions.ts` used to hand-type a three-decimal `weight` beside each
 * `marketValue`; the pair disagreed on 135 of 350 served positions, by up to 0.0500pp — $6,000 on
 * acc-006's $12M AGG line. Task 8 patched one consumer (the rebalance cash cap); every other
 * consumer still carried the error. The weight is now derived at the point positions are served
 * and the stored field is gone, so the two can no longer disagree.
 *
 * The bound here is 1e-9, not a percentage band. A derived weight is `marketValue / totalValue`
 * evaluated in the same IEEE-754 double the consumer will use, so the only tolerable difference is
 * float representation. A band wide enough to admit a rounded figure would hide exactly the defect
 * this file exists to catch.
 */
describe('Position weight is derived from market value', () => {
  const EXPLICIT_ACCOUNT_IDS = new Set(allPositions.map((p) => p.accountId))
  const generatedAccounts = accounts.filter((a) => !EXPLICIT_ACCOUNT_IDS.has(a.id))

  it('every position weight equals its own market value over the account total', () => {
    let checked = 0
    const drift: string[] = []
    for (const account of accounts) {
      const positions = getPositionsForAccount(account.id, account.totalValue)
      for (const position of positions) {
        checked++
        const derived = position.marketValue / account.totalValue
        // `NaN > 1e-9` is false, so a non-finite value on *either* side would slip through the
        // comparison below without being named. Both are checked explicitly rather than trusted:
        // a zero-value account makes `derived` NaN while `weight` is a perfectly finite 0, which
        // is the same failure mode one variable over.
        if (!Number.isFinite(position.weight) || !Number.isFinite(derived)) {
          drift.push(
            `${account.id} ${position.symbol}: weight is ${String(position.weight)} and ` +
              `marketValue / totalValue is ${String(derived)} (${position.marketValue} / ` +
              `${account.totalValue}) — one of them is not a finite number.`,
          )
        } else if (Math.abs(position.weight - derived) > 1e-9) {
          drift.push(
            `${account.id} ${position.symbol}: stored ${position.weight} vs derived ` +
              `${derived.toFixed(6)} — a difference of ` +
              `${(Math.abs(position.weight - derived) * 100).toFixed(4)}pp, worth ` +
              `$${(Math.abs(position.weight - derived) * account.totalValue).toFixed(2)} ` +
              `on this ${account.totalValue.toLocaleString('en-US')} account.`,
          )
        }
      }
    }
    expect(checked, 'vacuity guard: no positions were checked').toBeGreaterThan(100)
    expect(accounts.length, 'vacuity guard: no accounts were loaded').toBeGreaterThan(40)
    expect(drift).toEqual([])
  })

  /**
   * `getPositionsForAccount` has two paths — explicit rows for 17 accounts, a generated allocation
   * for the other 30. The generated path is the one most likely to be forgotten, so it is asserted
   * separately rather than being allowed to hide inside the sweep above.
   */
  it('the generated path derives its weights too', () => {
    expect(generatedAccounts.length, 'vacuity guard: no generated accounts').toBeGreaterThan(25)
    let checked = 0
    const drift: string[] = []
    for (const account of generatedAccounts) {
      const positions = getPositionsForAccount(account.id, account.totalValue)
      expect(positions.length, `${account.id} served no positions`).toBe(7)
      for (const position of positions) {
        checked++
        const derived = position.marketValue / account.totalValue
        if (!Number.isFinite(position.weight) || !Number.isFinite(derived)
          || Math.abs(position.weight - derived) > 1e-9) {
          drift.push(`${account.id} ${position.symbol}: ${String(position.weight)} vs ${String(derived)}`)
        }
      }
    }
    expect(checked, 'vacuity guard').toBeGreaterThan(150)
    expect(drift).toEqual([])
  })

  it('the explicit path derives its weights too', () => {
    const explicitAccounts = accounts.filter((a) => EXPLICIT_ACCOUNT_IDS.has(a.id))
    expect(explicitAccounts.length, 'vacuity guard: no explicit accounts').toBe(17)
    let checked = 0
    const drift: string[] = []
    for (const account of explicitAccounts) {
      for (const position of getPositionsForAccount(account.id, account.totalValue)) {
        checked++
        const derived = position.marketValue / account.totalValue
        if (!Number.isFinite(position.weight) || !Number.isFinite(derived)
          || Math.abs(position.weight - derived) > 1e-9) {
          drift.push(`${account.id} ${position.symbol}: ${String(position.weight)} vs ${String(derived)}`)
        }
      }
    }
    expect(checked, 'vacuity guard').toBeGreaterThan(100)
    expect(drift).toEqual([])
  })

  /**
   * Because `Σ marketValue === account.totalValue` exactly for all 47 accounts (asserted in
   * rollup-invariants.test.ts), derived weights sum to 1 to within float error. This is the tight
   * form of rollup-invariants.test.ts:257-268, which carries a ±0.005 band sized for the old
   * hand-typed weights. That file is frozen, so the tight bound lives here instead.
   */
  it.each(accounts.map((a) => [a.id, a.name, a] as const))(
    '%s (%s): Σ derived weight === 1 exactly',
    (_id, _name, account) => {
      const positions = getPositionsForAccount(account.id, account.totalValue)
      expect(positions.length, `${account.id} served no positions`).toBeGreaterThan(0)
      const sum = positions.reduce((s, p) => s + p.weight, 0)
      expect(
        sum,
        `${account.id} (${account.name}): Σ derived weight across ${positions.length} positions = ` +
          `${sum.toFixed(12)}, expected 1 (delta ${(sum - 1).toExponential(3)}).`,
      ).toBeCloseTo(1, 10)
    },
  )

  /**
   * The seed rows must not carry a weight at all. If one is ever re-added by hand it would be
   * spread over the derived value by `getPositionsForAccount` and silently win.
   */
  it('no seed row carries a stored weight', () => {
    expect(allPositions.length, 'vacuity guard: no seed rows').toBe(141)
    const withWeight = allPositions
      .filter((p) => Object.prototype.hasOwnProperty.call(p, 'weight'))
      .map((p) => `${p.id} (${p.accountId} ${p.symbol})`)
    expect(withWeight).toEqual([])
  })
})
