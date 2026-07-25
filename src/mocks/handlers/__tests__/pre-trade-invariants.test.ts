import { describe, it, expect } from 'vitest'
import { preTradeCheck, previewRebalance } from '@/services/oms'
import { checkTradeCompliance } from '@/services/compliance'

describe('pre-trade concentration uses the account own value', () => {
  it('C27: a $600K trade is 5% of the $12M Chen Trust, not 24% — no violation, trade passes', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 2_234, estimatedValue: 600_000,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))
    // Correctly computed, this trade never crosses the fund warning threshold (28% of $12M), so no
    // violation is produced at all — the point of this test is the unconditional assertion below,
    // not the contents of a violation object that correct behaviour never returns.
    expect(concentration).toBeUndefined()
    expect(result.passed).toBe(true)
  })

  it('C27: a $100K trade is 100% of Nancy Taylor $100K account and blocks', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-040', symbol: 'NVDA', side: 'buy', quantity: 128, estimatedValue: 100_000,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))!
    expect(Number(concentration.currentValue.replace('%', ''))).toBeGreaterThan(90)
    expect(concentration.severity).toBe('block')
    expect(result.passed).toBe(false)
  })

  it('C28: an order without a notional is rejected rather than valued at quantity x 100', async () => {
    await expect(preTradeCheck({
      accountId: 'acc-001', symbol: 'NVDA', side: 'buy', quantity: 100, estimatedValue: undefined as unknown as number,
    })).rejects.toThrow()
  })

  it('C28 fix round 2: a zero notional is rejected, not treated as a compliant $0 order', async () => {
    await expect(preTradeCheck({
      accountId: 'acc-001', symbol: 'NVDA', side: 'buy', quantity: 100, estimatedValue: 0,
    })).rejects.toThrow()
  })

  it('C28 fix round 2: a negative notional is rejected', async () => {
    await expect(preTradeCheck({
      accountId: 'acc-001', symbol: 'NVDA', side: 'buy', quantity: 100, estimatedValue: -5_000_000,
    })).rejects.toThrow()
  })

  it('C23: a fund purchase is measured against the fund limit, not the single-issuer limit', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 1_000, estimatedValue: 268_500,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))
    expect(concentration).toBeDefined()
    expect(concentration!.limit).toBe('35.0%')
  })
})

describe('fix round 2 · pre-trade concentration is computed in the account\'s own currency', () => {
  // acc-041 (Chen-Wong HK Equity) is HKD-denominated: totalValue 12,500,000, cashBalance 700,000,
  // and already holds 2800.HK (Tracker Fund of Hong Kong, a `fund`-kind security) at 1,772,000 —
  // 14.2% of the account. Mixing a USD-converted denominator (`accountValueUSD`) against the
  // native-currency `marketValue`/`cashBalance` previously divided by ~7.82 (the HKD/USD rate),
  // inflating a clean 1%-of-account trade to a reported 118.7% concentration and 43.8% cash
  // reading (true post-trade cash is 5.6%/4.6%) — hard-blocking every trade in the account.
  it('a 1%-of-account buy of an already-held fund position produces no violation at all', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-041', symbol: '2800.HK', side: 'buy', quantity: 5_644, estimatedValue: 125_000,
    })
    expect(result.violations).toEqual([])
    expect(result.passed).toBe(true)
  })

  it('still blocks a genuine breach in acc-041, now measured against the account\'s own $12.5M(HKD) value', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-041', symbol: '2800.HK', side: 'buy', quantity: 135_440, estimatedValue: 3_000_000,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))!
    expect(concentration.severity).toBe('block')
    // (1,772,000 + 3,000,000) / 12,500,000 = 38.2%
    expect(Number(concentration.currentValue.replace('%', ''))).toBeCloseTo(38.2, 1)
  })
})

describe('fix round 2 · cash and sector gates fire on the projected post-trade figure, not a raw notional threshold', () => {
  it('does not warn on cash reserve when projected post-trade cash comfortably clears the 2% floor', async () => {
    // acc-006 cashBalance 1,012,470; a $150K buy leaves ~$862K, ~7.2% of the $12M account —
    // nowhere near the 2% floor, but the old `estValue > 100_000` heuristic warned anyway.
    const result = await preTradeCheck({
      accountId: 'acc-006', symbol: 'AAPL', side: 'buy', quantity: 768, estimatedValue: 150_000,
    })
    expect(result.violations.find((v) => v.constraint.includes('Cash reserve'))).toBeUndefined()
  })

  it('warns on cash reserve only once the projected post-trade cash actually breaches the floor', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 3_726, estimatedValue: 1_000_000,
    })
    const cash = result.violations.find((v) => v.constraint.includes('Cash reserve'))!
    expect(cash).toBeDefined()
    expect(cash.currentValue).not.toBe('2.8%')
    // (1,012,470 - 1,000,000) / 12,000,000 = 0.1%
    expect(Number(cash.currentValue.replace('%', ''))).toBeCloseTo(0.1, 1)
    expect(cash.severity).toBe('warning')
  })

  it('does not warn on sector concentration when the projected tech weight is nowhere near the 40% limit', async () => {
    // acc-006 holds no tech names at all (SPY/QQQ/VTI/EFA/VXUS/VWO/AGG/BNDX/LQD/BXPE/QAI/VNQ are
    // not in TECH_SYMBOLS), so a $150K AAPL buy projects to 1.25% — the old `estValue > 50_000`
    // heuristic warned regardless, showing "currently 0.0% ... limit 40%".
    const result = await preTradeCheck({
      accountId: 'acc-006', symbol: 'AAPL', side: 'buy', quantity: 768, estimatedValue: 150_000,
    })
    expect(result.violations.find((v) => v.constraint.includes('Sector concentration'))).toBeUndefined()
  })

  it('warns on sector concentration only once the projected weight approaches the 40% limit', async () => {
    // acc-001 already holds 19.2% technology (AAPL 7.6% + MSFT 9.2% + NVDA 2.4%); this $1.2M AAPL
    // buy projects it to 33.9%.
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'AAPL', side: 'buy', quantity: 6_142, estimatedValue: 1_200_000,
    })
    const sector = result.violations.find((v) => v.constraint.includes('Sector concentration'))!
    expect(sector).toBeDefined()
    expect(sector.currentValue).not.toBe('38.2%')
    expect(Number(sector.currentValue.replace('%', ''))).toBeCloseTo(33.9, 1)
    expect(sector.severity).toBe('warning')
  })
})

describe('rebalance tax estimation', () => {
  it('C26: turning tax-awareness off does not make the estimated tax zero', async () => {
    const aware = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    const unaware = await previewRebalance({ accountIds: ['acc-001'], taxAware: false })
    expect(unaware[0]!.estimatedTaxImpact).toBeGreaterThan(0)
    expect(unaware[0]!.estimatedTaxImpact).toBeGreaterThanOrEqual(aware[0]!.estimatedTaxImpact)
  })

  it('C26: the preview total equals the sum of its trade-level tax impacts', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    expect(preview!.estimatedTaxImpact)
      .toBeCloseTo(preview!.trades.reduce((s, t) => s + t.taxImpact, 0), 0)
  })
})

describe('fix round 2 · rebalance tax respects account tax treatment', () => {
  it('a Roth IRA (tax_free) rebalance never shows a capital-gains tax impact, even though it sells at a gain', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-004'], taxAware: true })
    expect(preview!.trades.some((t) => t.side === 'sell')).toBe(true)
    expect(preview!.trades.every((t) => t.taxImpact === 0)).toBe(true)
    expect(preview!.estimatedTaxImpact).toBe(0)
  })

  it('a traditional IRA (tax_deferred) rebalance never shows a capital-gains tax impact either', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-008'], taxAware: true })
    expect(preview!.trades.some((t) => t.side === 'sell')).toBe(true)
    expect(preview!.trades.every((t) => t.taxImpact === 0)).toBe(true)
    expect(preview!.estimatedTaxImpact).toBe(0)
  })
})

describe('fix round 2 · rebalance is self-financing', () => {
  it('acc-004: sells no longer net ~18% of the account to cash when an underweight class has no tradable candidate', async () => {
    // acc-004 (Roth IRA, $450K) targets emerging_markets/alternatives it doesn't hold at all, so
    // those buys have nowhere to go; before this fix the account sold $135,000 and bought only
    // $54,000, parking the $81,000 (18%) difference in cash instead of scaling the sells down to
    // what the buy side could actually absorb.
    const [preview] = await previewRebalance({ accountIds: ['acc-004'], taxAware: true })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(Math.abs(totalSell - totalBuy)).toBeLessThanOrEqual(5)
  })
})

describe('fix round 2 · rebalance drift threshold is respected', () => {
  it('a loose driftThreshold produces fewer trades than a tight one, for the same account', async () => {
    const loose = await previewRebalance({ accountIds: ['acc-001'], taxAware: true, driftThreshold: 0.10 })
    const tight = await previewRebalance({ accountIds: ['acc-001'], taxAware: true, driftThreshold: 0.001 })
    expect(loose[0]!.trades.length).toBeLessThan(tight[0]!.trades.length)
  })
})

describe('fix round 2 · rebalance trade direction follows actual vs target, not the (always-positive) drift magnitude', () => {
  it('acc-001: VTI (overweight us_equity) sells, EFA (underweight intl_equity) buys', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    const vti = preview!.trades.find((t) => t.symbol === 'VTI')
    const efa = preview!.trades.find((t) => t.symbol === 'EFA')
    expect(vti?.side).toBe('sell')
    expect(efa?.side).toBe('buy')
  })
})

describe('oms.ts pre-trade wash-sale check is derived from realised sales, not a hand-typed symbol list', () => {
  it('flags INTC in acc-002 (hh-001), which itself realised the INTC loss sale 4 days ago', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-002', symbol: 'INTC', side: 'buy', quantity: 100, estimatedValue: 2_845,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeDefined()
  })

  it('fix round 2: flags INTC in acc-003 (hh-001 IRA), a sibling account of the one that sold it at a loss', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-003', symbol: 'INTC', side: 'buy', quantity: 100, estimatedValue: 2_845,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeDefined()
  })

  it('fix round 2: does not flag a sell of INTC in acc-002 — the wash sale is triggered by repurchasing, not by selling', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 100, estimatedValue: 2_845,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeUndefined()
  })

  it('fix round 2: does not flag NVDA in acc-001 (hh-001) — its loss sale (rs-002) was in acc-007/hh-002, a different household', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'NVDA', side: 'buy', quantity: 10, estimatedValue: 7_800,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeUndefined()
  })

  it('does not flag VTI — the old hand-typed list (VTI, NVDA, AAPL) claimed a VTI wash-sale risk that no loss sale in the fixture supports', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 10, estimatedValue: 2_685,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeUndefined()
  })
})

describe('compliance.ts /api/compliance/check-trades concentration uses per-kind limits, not a blanket 10%', () => {
  it('C11: a $400K VTI buy in the $8.2M Johnson Trust is a warning under its 35% fund limit, not a fail under a blanket single-name limit', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-001', trades: [{ symbol: 'VTI', side: 'buy', quantity: 1_489, estimatedValue: 400_000 }] },
    ])
    const concentrationCheck = result!.checks.find((c) => c.category === 'concentration_limit')!
    expect(concentrationCheck.status).toBe('warning')
    expect(result!.overallStatus).toBe('warning')
  })

  it('C11: a $400K single-name buy of the same size in the same account fails the 10% limit outright', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-001', trades: [{ symbol: 'AAPL', side: 'buy', quantity: 2_047, estimatedValue: 400_000 }] },
    ])
    const concentrationCheck = result!.checks.find((c) => c.category === 'concentration_limit')!
    expect(concentrationCheck.status).toBe('fail')
  })

  it('C11: existing position weights are derived from positions.ts, not the stale hand-typed map (acc-001 VTI is 27.8%, not 32%)', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-001', trades: [{ symbol: 'VTI', side: 'buy', quantity: 2_610, estimatedValue: 700_000 }] },
    ])
    const concentrationCheck = result!.checks.find((c) => c.category === 'concentration_limit')!
    expect(concentrationCheck.details?.currentWeight).toBeCloseTo(0.278, 2)
    expect(concentrationCheck.details?.limit).toBe(0.35)
  })
})

describe('compliance.ts /api/compliance/check-trades wash-sale check is household-scoped, not account-scoped', () => {
  it('C10: a proposed INTC buy in acc-003 (hh-001 IRA) flags the window opened by sibling account acc-002 selling INTC at a loss', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-003', trades: [{ symbol: 'INTC', side: 'buy', quantity: 100, estimatedValue: 3_000 }] },
    ])
    const washSaleCheck = result!.checks.find((c) => c.category === 'wash_sale')!
    expect(washSaleCheck.status).toBe('warning')
    expect(washSaleCheck.rule).toContain('INTC')
  })
})

describe('fix round 2 · the two compliance endpoints agree on a single severity ladder', () => {
  it('a VTI buy taking acc-001 to ~40% weight is a fail on both /api/compliance/check-trades and a block on /api/oms/orders/pre-check', async () => {
    // 40% is above the 35% fund limit on both endpoints — previously "fail" required 1.5x the
    // limit (52.5%) on the compliance endpoint while the pre-check endpoint blocked at 1.0x (35%),
    // so the same trade could be a block on one surface and a mere warning on the other.
    const estimatedValue = 0.40 * 8_200_000 - 2_282_250 // existing VTI marketValue in acc-001
    const [complianceResult] = await checkTradeCompliance([
      { accountId: 'acc-001', trades: [{ symbol: 'VTI', side: 'buy', quantity: 1, estimatedValue }] },
    ])
    const preCheckResult = await preTradeCheck({ accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 1, estimatedValue })

    const complianceConcentration = complianceResult!.checks.find((c) => c.category === 'concentration_limit')!
    const preCheckConcentration = preCheckResult.violations.find((v) => v.constraint.includes('concentration'))!

    expect(complianceConcentration.status).toBe('fail')
    expect(preCheckConcentration.severity).toBe('block')
  })
})
