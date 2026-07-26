import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { getPositions, getDrift } from '@/services/pms'
import { getAccounts } from '@/services/custodian'

/**
 * Merge integration · Task 21 x Task 22 — these two tasks were built on parallel branches and each
 * passed its own review. Task 21 made `DriftStatus.drift` **signed** (negative = underweight);
 * Task 22's rebalance engine, written against the unsigned version, filtered candidates with
 * `d.drift > driftThreshold` and sized them with `d.drift * totalValue`. Neither branch's tests
 * could see the interaction. On merge, every underweight asset class silently vanished from the
 * proposal: 41 of 47 accounts produced all-sell rebalances that raised cash they had no target for.
 *
 * Seven of Task 22's own tests caught it, but only because they pin specific dollar figures — the
 * *reason* they broke was invisible from any one of them. These assert the property directly, so
 * the next change to either side of the boundary fails for a legible reason.
 */
describe('rebalance consumes signed drift correctly (Task 21 x Task 22 merge boundary)', () => {
  it('an account underweight a class it already holds proposes a BUY, not only sells', async () => {
    // acc-001 is overweight us_equity (VTI) and underweight intl_equity (EFA), and holds both.
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    expect(preview).toBeDefined()
    const sides = new Set(preview!.trades.map((t) => t.side))
    expect(sides.has('buy'), 'acc-001 must propose at least one buy').toBe(true)
    expect(sides.has('sell'), 'acc-001 must propose at least one sell').toBe(true)
  })

  it('across the whole book, buys are not a rounding error against sells', async () => {
    // Under the unsigned-drift bug this ratio was 0.00 — every buy in the book disappeared.
    const accounts = await getAccounts()
    let totalBuy = 0
    let totalSell = 0
    for (const account of accounts) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      for (const trade of preview?.trades ?? []) {
        if (trade.side === 'buy') totalBuy += trade.estimatedValue
        else totalSell += trade.estimatedValue
      }
    }
    expect(totalSell).toBeGreaterThan(0)
    expect(totalBuy / totalSell).toBeGreaterThan(0.8)
  })

  it('every proposed trade sizes to the magnitude of its own drift, in the direction of its sign', async () => {
    const accounts = await getAccounts()
    const mismatches: string[] = []
    for (const account of accounts) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      if (!preview?.trades.length) continue
      const drift = await getDrift(account.id)
      const positions = await getPositions(account.id)
      for (const trade of preview.trades) {
        const position = positions.find((p) => p.symbol === trade.symbol)
        if (!position) {
          mismatches.push(`${account.id} ${trade.symbol}: trade in a security the account does not hold`)
          continue
        }
        const row = drift.assetClassDrifts?.find((d) => d.assetClass === position.assetClass)
        if (!row) {
          mismatches.push(`${account.id} ${trade.symbol}: no drift row for ${position.assetClass}`)
          continue
        }
        // Sign governs direction: overweight (positive drift) sells, underweight buys.
        const expected = row.drift > 0 ? 'sell' : 'buy'
        if (trade.side !== expected) {
          mismatches.push(
            `${account.id} ${trade.symbol}: ${trade.side} against drift ${(row.drift * 100).toFixed(2)}%`,
          )
        }
        // Magnitude governs size: no trade may exceed |drift| x totalValue. Sells are additionally
        // capped by the position held and by self-financing, so this is an upper bound, not equality.
        const ceiling = Math.abs(row.drift) * account.totalValue + 1
        if (trade.estimatedValue > ceiling) {
          mismatches.push(
            `${account.id} ${trade.symbol}: ${trade.estimatedValue} exceeds |drift| ceiling ${ceiling.toFixed(0)}`,
          )
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})
