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

  it('C23: a fund purchase is measured against the fund limit, not the single-issuer limit', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 1_000, estimatedValue: 268_500,
    })
    const concentration = result.violations.find((v) => v.constraint.includes('concentration'))
    expect(concentration).toBeDefined()
    expect(concentration!.limit).toBe('35.0%')
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

describe('oms.ts pre-trade wash-sale check is derived from realised sales, not a hand-typed symbol list', () => {
  it('flags INTC in acc-002 (hh-001), which itself realised the INTC loss sale 4 days ago', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-002', symbol: 'INTC', side: 'buy', quantity: 100, estimatedValue: 2_845,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeDefined()
  })

  it('does not flag VTI — the old hand-typed list (VTI, NVDA, AAPL) claimed a VTI wash-sale risk that no loss sale in the fixture supports', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'VTI', side: 'buy', quantity: 10, estimatedValue: 2_685,
    })
    const washSale = result.violations.find((v) => v.constraint.includes('Wash sale'))
    expect(washSale).toBeUndefined()
  })

  it('technology sector exposure is derived from real positions, not a fixed 38.2% literal', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'AAPL', side: 'buy', quantity: 300, estimatedValue: 58_620,
    })
    const sector = result.violations.find((v) => v.constraint.includes('Sector concentration'))!
    expect(sector.currentValue).not.toBe('38.2%')
    expect(Number(sector.currentValue.replace('%', ''))).toBeCloseTo(19.2, 1)
  })

  it('cash reserve percentage is derived from the account cash balance, not a fixed 2.8% literal', async () => {
    const result = await preTradeCheck({
      accountId: 'acc-006', symbol: 'VTI', side: 'buy', quantity: 500, estimatedValue: 134_250,
    })
    const cash = result.violations.find((v) => v.constraint.includes('Cash reserve'))!
    expect(cash.currentValue).not.toBe('2.8%')
    // acc-006 cashBalance 1,012,470 / totalValue 12,000,000
    expect(Number(cash.currentValue.replace('%', ''))).toBeCloseTo(8.4, 1)
  })
})

describe('compliance.ts /api/compliance/check-trades concentration uses per-kind limits, not a blanket 10%', () => {
  it('C11: a $400K VTI buy in the $8.2M Johnson Trust stays a fund position under its 35% limit, not a false single-name breach', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-001', trades: [{ symbol: 'VTI', side: 'buy', quantity: 1_489, estimatedValue: 400_000 }] },
    ])
    const concentrationCheck = result!.checks.find((c) => c.category === 'concentration_limit')!
    expect(concentrationCheck.status).toBe('pass')
    expect(result!.overallStatus).toBe('pass')
  })

  it('C11: a $400K single-name buy of the same size in the same account breaches the 10% limit', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-001', trades: [{ symbol: 'AAPL', side: 'buy', quantity: 2_047, estimatedValue: 400_000 }] },
    ])
    const concentrationCheck = result!.checks.find((c) => c.category === 'concentration_limit')!
    expect(concentrationCheck.status).not.toBe('pass')
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
