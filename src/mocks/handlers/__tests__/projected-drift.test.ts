import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { generateRebalanceTrades, projectDrift, residualReason, type ProposedTradeLeg, type ResidualFacts } from '@/mocks/handlers/oms'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { roundTo } from '@/mocks/handlers/utils'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { isMarketTradable } from '@/lib/security-master'
import { isModelManaged, requireModelManaged } from '@/lib/mandate'

const TAX_MODES = [true, false] as const

/** Asset-class weights after `legs`, computed here from the positions and the legs alone. */
function classWeightsAfter(accountId: string, legs: readonly ProposedTradeLeg[]): Map<string, number> {
  const account = accounts.find((a) => a.id === accountId)!
  const value = new Map<string, number>()
  for (const p of getPositionsForAccount(account.id, account.totalValue)) value.set(p.assetClass, (value.get(p.assetClass) ?? 0) + p.marketValue)
  for (const leg of legs) {
    const signed = leg.side === 'sell' ? -leg.estimatedValue : leg.estimatedValue
    value.set(leg.assetClass, (value.get(leg.assetClass) ?? 0) + signed)
    value.set('cash', (value.get('cash') ?? 0) - signed)
  }
  const total = [...value.values()].reduce((s, v) => s + v, 0)
  return new Map([...value].map(([assetClass, v]) => [assetClass, v / total]))
}

describe('§0.6 · projected drift after the proposed trades', () => {
  it.each(TAX_MODES)('(a) every account: projected drift is the drift function on the post-trade holdings (taxAware=%s)', (taxAware) => {
    for (const account of accounts.filter(isModelManaged)) {
      const legs = generateRebalanceTrades(account.id, taxAware)
      const projected = projectDrift(account.id, legs, taxAware)
      const weights = classWeightsAfter(account.id, legs)
      for (const d of projected.assetClassDrifts) {
        expect(d.actual, `${account.id} ${d.assetClass}`).toBeCloseTo(weights.get(d.assetClass) ?? 0, 9)
        expect(d.drift, `${account.id} ${d.assetClass}`).toBe(roundTo(d.actual - d.target, 4))
      }
      expect(projected.maxAbsDrift).toBe(roundTo(Math.max(0, ...projected.assetClassDrifts.map((d) => Math.abs(d.drift))), 4))
      expect(projected.driftTolerance).toBe(computeDriftForAccount(requireModelManaged(account)).driftTolerance)
    }
  })

  it('an account with no trades projects exactly its current drift', () => {
    const quiet = accounts.filter(isModelManaged).filter((a) => generateRebalanceTrades(a.id, true).length === 0)
    expect(quiet.length).toBeGreaterThan(0)
    for (const account of quiet) {
      const projected = projectDrift(account.id, [], true)
      expect(projected.assetClassDrifts.map(({ assetClass, target, actual, drift }) => ({ assetClass, target, actual, drift })))
        .toEqual(computeDriftForAccount(requireModelManaged(account)).assetClassDrifts)
    }
  })

  it('the rebalance preview serves the same projection the engine computes', async () => {
    const previews = await previewRebalance({ accountIds: accounts.filter(isModelManaged).map((a) => a.id), taxAware: true })
    for (const preview of previews) {
      // Through JSON, as the handler serves it (a -0 drift arrives as 0).
      const engine = projectDrift(preview.accountId, generateRebalanceTrades(preview.accountId, true), true)
      expect(preview.projectedDrift).toEqual(JSON.parse(JSON.stringify(engine)))
    }
  })

  it('(b) acc-002: the trades lower max drift, and private equity stays, unsellable', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const current = computeDriftForAccount(requireModelManaged(accounts.find((a) => a.id === 'acc-002')!))
    expect(preview!.projectedDrift.maxAbsDrift).toBeLessThan(current.maxAbsDrift)
    const pe = preview!.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    expect(pe.drift).toBe(current.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!.drift)
    expect(pe.residualReason).toBe('not_market_tradable')
    expect(Object.fromEntries(preview!.projectedDrift.assetClassDrifts.filter((d) => d.residualReason).map((d) => [d.assetClass, d.residualReason]))).toEqual({
      intl_equity: 'cash_capped', emerging_markets: 'cash_capped', alternatives: 'cash_capped', private_equity: 'not_market_tradable',
    })
  })

  it('a threshold wider than the band (the Rebalance page sends 10%) still explains what it leaves', () => {
    const projected = projectDrift('acc-002', generateRebalanceTrades('acc-002', true, 0.1), true, 0.1)
    const usEquity = projected.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(Math.abs(usEquity.drift)).toBeGreaterThan(0.1)
    expect(usEquity.residualReason).toBe('cash_capped')
    expect(projected.withinBand).toBe(false)
  })

  it('a migration preview projects against the model it migrates to', () => {
    const legs = generateRebalanceTrades('acc-002', true, 0.005, 'mod-003')
    const projected = projectDrift('acc-002', legs, true, 0.005, 'mod-003')
    const mod003 = computeDriftForAccount(accounts.find((a) => a.id === 'acc-002')!, 'mod-003')
    expect(projected.driftTolerance).toBe(mod003.driftTolerance)
    for (const d of projected.assetClassDrifts) expect(d.target).toBe(mod003.assetClassDrifts.find((c) => c.assetClass === d.assetClass)?.target ?? 0)
  })

  it.each(TAX_MODES)('every invested class left beyond the threshold has a reason, and only those (taxAware=%s)', (taxAware) => {
    for (const threshold of [0.005, 0.02, 0.05, 0.1]) {
      for (const account of accounts.filter(isModelManaged)) {
        const projected = projectDrift(account.id, generateRebalanceTrades(account.id, taxAware, threshold), taxAware, threshold)
        for (const d of projected.assetClassDrifts) {
          const residual = d.assetClass !== 'cash' && Math.abs(d.drift) > threshold
          expect(d.residualReason !== undefined, `${account.id} ${d.assetClass} at ${threshold}`).toBe(residual)
        }
      }
    }
  })

  it.each(TAX_MODES)('cash_capped is only claimed where the cash band stopped the trades (taxAware=%s)', (taxAware) => {
    let claimed = 0
    for (const threshold of [0.005, 0.02, 0.05, 0.1]) {
      for (const account of accounts.filter(isModelManaged)) {
        const legs = generateRebalanceTrades(account.id, taxAware, threshold)
        const projected = projectDrift(account.id, legs, taxAware, threshold)
        const startCash = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === 'CASH')?.marketValue ?? 0
        const targetCash = (projected.assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0) * account.totalValue
        const endCash = startCash + legs.reduce((s, l) => s + (l.side === 'sell' ? l.estimatedValue : -l.estimatedValue), 0)
        // Each leg is floored to whole units, so the band is reached to within one unit per leg.
        const slack = 1 + legs.reduce((s, l) => s + l.estimatedValue / l.quantity, 0)
        for (const d of projected.assetClassDrifts.filter((x) => x.residualReason === 'cash_capped')) {
          claimed++
          // Underweight: buys stopped at the band's floor. Overweight: sells stopped at its ceiling.
          // Two-sided: the cash ends at that bound, within the flooring slack, neither short of it
          // (the band did not bind) nor past it (the trades broke the band).
          const bound = d.drift < 0 ? Math.min(startCash, targetCash) : Math.max(startCash, targetCash)
          expect(Math.abs(endCash - bound), `${account.id} ${d.assetClass} at ${threshold}`).toBeLessThanOrEqual(slack)
        }
      }
    }
    expect(claimed).toBeGreaterThan(0)
  })

  it('not_market_tradable is only claimed for an overweight class holding a security with no market', () => {
    for (const account of accounts.filter(isModelManaged)) {
      const positions = getPositionsForAccount(account.id, account.totalValue)
      for (const d of projectDrift(account.id, generateRebalanceTrades(account.id, true), true).assetClassDrifts) {
        if (d.residualReason !== 'not_market_tradable') continue
        expect(d.drift).toBeGreaterThan(0)
        expect(positions.some((p) => p.assetClass === d.assetClass && !isMarketTradable(p.symbol))).toBe(true)
      }
    }
  })
})

describe('residualReason', () => {
  const base: ResidualFacts = { drift: 0.02, totalValue: 1_000_000, sellableLeft: 0, nonTradableLeft: 0, replacementHeldLeft: 0, unitPrice: 100 }
  it('an overweight excess nothing sellable can absorb, held in a periodic-liquidity fund', () => {
    expect(residualReason({ ...base, nonTradableLeft: 20_000 })).toBe('not_market_tradable')
  })
  it('an overweight excess held in a harvest replacement inside its hold', () => {
    expect(residualReason({ ...base, replacementHeldLeft: 20_000 })).toBe('replacement_hold')
  })
  it('a gap smaller than one unit of what would close it', () => {
    expect(residualReason({ ...base, drift: -0.00005, unitPrice: 87_450 })).toBe('below_lot_size')
  })
  it('a gap the sellable positions could close, left by the cash band', () => {
    expect(residualReason({ ...base, sellableLeft: 500_000, nonTradableLeft: 20_000 })).toBe('cash_capped')
    expect(residualReason({ ...base, drift: -0.03 })).toBe('cash_capped')
  })
})
