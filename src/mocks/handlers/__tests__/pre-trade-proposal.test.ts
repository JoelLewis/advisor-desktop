import { describe, it, expect } from 'vitest'
import { preTradeCheckProposal, previewRebalance } from '@/services/oms'
import type { ProposalTradeLeg } from '@/services/oms'

/**
 * Proposal-level pre-trade compliance. The single-order check (`/api/oms/orders/pre-check`) reads
 * each leg against the account's CURRENT holdings, so a multi-leg rebalance gets wrong answers:
 * a buy cannot see the proposal's own sale proceeds, and a trim cannot see that it moves a
 * position toward its limit. The proposal check applies every leg to one projected portfolio
 * (sells before buys; cash = current cash + sell proceeds − buy cost) and evaluates the end state,
 * naming the legs behind each violation.
 *
 * acc-002 (Robert Johnson, taxable, $4.5M, cash $225,504) tax-aware proposal:
 *   sell INTC 199,150 · sell SPY 394,387 · buy EFA 294,469 · buy VWO 198,957 · buy AGG 154,350
 *   buy QAI 198,950 · buy GLD 79,556 · sell ETHE 71,623 · sell IBIT 170,755
 * Sells 835,915, buys 926,282 → end cash 225,504 + 835,915 − 926,282 = 135,137 (3.0%).
 * SPY 2,018,243.70 − 394,387 = 1,623,856.70 → 36.1% against the 35% fund limit (was 44.8%).
 */
async function acc002Legs(): Promise<ProposalTradeLeg[]> {
  const [preview] = await previewRebalance('user-001', { accountIds: ['acc-002'], taxAware: true })
  return preview!.trades.map((t) => ({ symbol: t.symbol, side: t.side, quantity: t.quantity, estimatedValue: t.estimatedValue }))
}

describe('preTradeCheckProposal · acc-002 tax-aware rebalance', () => {
  it('the rebalance is an EFA buy funded by an SPY trim — the legs the checks below read', async () => {
    const legs = await acc002Legs()
    const efa = legs.find((l) => l.symbol === 'EFA')!
    const spy = legs.find((l) => l.symbol === 'SPY')!
    expect(efa.side).toBe('buy')
    expect(spy.side).toBe('sell')
  })

  it('passes: no leg is blocked', async () => {
    const result = await preTradeCheckProposal('user-001', { accountId: 'acc-002', trades: await acc002Legs() })
    expect(result.violations.filter((v) => v.severity === 'block')).toEqual([])
    expect(result.passed).toBe(true)
    expect(result.legs.every((l) => l.severity !== 'block')).toBe(true)
  })

  it('funds the EFA buy from the proposal\'s own sale proceeds — end cash is 3.0%, above the 2% floor', async () => {
    const result = await preTradeCheckProposal('user-001', { accountId: 'acc-002', trades: await acc002Legs() })
    expect(result.projectedCash).toBe(135_137)
    expect(result.projectedCashPct).toBeCloseTo(0.0300, 4)
    expect(result.violations.find((v) => v.category === 'cash_minimum')).toBeUndefined()
    const efaIndex = result.legs.findIndex((l) => l.symbol === 'EFA')
    expect(result.legs[efaIndex]!.severity).toBe('pass')
  })

  it('treats the SPY trim as reducing a pre-existing breach: a warning that the limit remains breached, not a block', async () => {
    const legs = await acc002Legs()
    const result = await preTradeCheckProposal('user-001', { accountId: 'acc-002', trades: legs })
    const spy = result.violations.find((v) => v.category === 'concentration_limit' && v.symbol === 'SPY')!
    expect(spy).toBeDefined()
    expect(spy.severity).toBe('warning')
    expect(spy.preExisting).toBe(true)
    expect(spy.currentWeight).toBeCloseTo(0.4485, 4)
    expect(spy.projectedWeight).toBeCloseTo(0.3609, 4)
    expect(spy.message).toMatch(/remains above/i)
    // Attributed to the SPY sell leg.
    const spyIndex = legs.findIndex((l) => l.symbol === 'SPY')
    expect(spy.legs).toEqual([spyIndex])
    expect(result.legs[spyIndex]!.severity).toBe('warning')
  })

  it('sells settle before buys whatever order the legs arrive in', async () => {
    const legs = await acc002Legs()
    const buysFirst = [...legs.filter((l) => l.side === 'buy'), ...legs.filter((l) => l.side === 'sell')]
    const result = await preTradeCheckProposal('user-001', { accountId: 'acc-002', trades: buysFirst })
    expect(result.passed).toBe(true)
    expect(result.projectedCash).toBe(135_137)
  })
})

describe('preTradeCheckProposal · per-leg attribution', () => {
  it('a buy that adds to an over-limit position blocks, and only that leg is blamed', async () => {
    // acc-002 SPY is 44.8% against 35%; buying more makes the breach worse.
    const trades: ProposalTradeLeg[] = [
      { symbol: 'AGG', side: 'buy', quantity: 10, estimatedValue: 1_000 },
      { symbol: 'SPY', side: 'buy', quantity: 10, estimatedValue: 5_203 },
    ]
    const result = await preTradeCheckProposal('user-001', { accountId: 'acc-002', trades })
    const spy = result.violations.find((v) => v.symbol === 'SPY')!
    expect(spy.severity).toBe('block')
    expect(spy.legs).toEqual([1])
    expect(result.legs.map((l) => l.severity)).toEqual(['pass', 'block'])
    expect(result.passed).toBe(false)
  })

  it('a buy that creates a breach blocks and is not marked pre-existing', async () => {
    // acc-006 ($12M) holds no NVDA; $1.56M is 13% against the 10% single-name limit.
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-006', trades: [{ symbol: 'NVDA', side: 'buy', quantity: 2_000, estimatedValue: 1_560_000 }],
    })
    const nvda = result.violations.find((v) => v.symbol === 'NVDA')!
    expect(nvda.severity).toBe('block')
    expect(nvda.preExisting).toBe(false)
    expect(nvda.legs).toEqual([0])
  })

  it('a pre-existing breach the proposal does not touch is reported, with no leg blamed', async () => {
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-002', trades: [{ symbol: 'AGG', side: 'buy', quantity: 10, estimatedValue: 1_000 }],
    })
    const spy = result.violations.find((v) => v.symbol === 'SPY')!
    expect(spy.severity).toBe('warning')
    expect(spy.preExisting).toBe(true)
    expect(spy.legs).toEqual([])
    expect(result.legs[0]!.severity).toBe('pass')
  })

  it('a cash shortfall is blamed on the buys, from the first leg that crosses the floor', async () => {
    // acc-001 cash 660,170 on $8.2M; floor 164,000. AGG 400,000 leaves 260,170 (3.2%, clear);
    // EFA 300,000 then leaves −39,830 → below zero → block, and only EFA crosses.
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-001', trades: [
        { symbol: 'AGG', side: 'buy', quantity: 4_000, estimatedValue: 400_000 },
        { symbol: 'EFA', side: 'buy', quantity: 3_600, estimatedValue: 300_000 },
      ],
    })
    const cash = result.violations.find((v) => v.category === 'cash_minimum')!
    expect(cash.severity).toBe('block')
    expect(cash.legs).toEqual([1])
    expect(result.projectedCash).toBe(-39_830)
    expect(result.legs.map((l) => l.severity)).toEqual(['pass', 'block'])
  })

  it('a sale that funds the same buys clears the cash floor', async () => {
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-001', trades: [
        { symbol: 'AGG', side: 'buy', quantity: 4_000, estimatedValue: 400_000 },
        { symbol: 'EFA', side: 'buy', quantity: 3_600, estimatedValue: 300_000 },
        { symbol: 'VTI', side: 'sell', quantity: 1_000, estimatedValue: 268_500 },
      ],
    })
    expect(result.violations.find((v) => v.category === 'cash_minimum')).toBeUndefined()
    expect(result.passed).toBe(true)
  })

  it('a restricted security blocks its own leg', async () => {
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-006', trades: [
        { symbol: 'AGG', side: 'buy', quantity: 10, estimatedValue: 1_000 },
        { symbol: 'META', side: 'buy', quantity: 10, estimatedValue: 7_000 },
      ],
    })
    const restricted = result.violations.find((v) => v.category === 'restricted_securities')!
    expect(restricted.severity).toBe('block')
    expect(restricted.legs).toEqual([1])
  })

  it('a buy inside an open wash-sale window warns on that leg', async () => {
    // acc-002 realized the INTC loss five days ago (hh-001).
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-002', trades: [{ symbol: 'INTC', side: 'buy', quantity: 100, estimatedValue: 2_845 }],
    })
    const wash = result.violations.find((v) => v.category === 'wash_sale')!
    expect(wash.severity).toBe('warning')
    expect(wash.legs).toEqual([0])
  })

  it('sector concentration is measured on the end state and blamed on the tech buys', async () => {
    // acc-001 holds 19.2% technology; $2M of AAPL projects to 43.6% against 40%.
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-001', trades: [
        { symbol: 'AGG', side: 'sell', quantity: 1_000, estimatedValue: 100_000 },
        { symbol: 'AAPL', side: 'buy', quantity: 10_237, estimatedValue: 2_000_000 },
      ],
    })
    const sector = result.violations.find((v) => v.category === 'sector_limit')!
    expect(sector.severity).toBe('block')
    expect(sector.projectedWeight).toBeCloseTo(0.436, 3)
    expect(sector.legs).toEqual([1])
  })

  it('selling tech out of a sector breach is not blocked by that breach', async () => {
    // Same buy, then a $500K MSFT trim inside the same proposal brings tech to 37.5%: below the
    // limit, inside the 32% warning band. The VTI sale funds the rest.
    const result = await preTradeCheckProposal('user-001', {
      accountId: 'acc-001', trades: [
        { symbol: 'AAPL', side: 'buy', quantity: 10_237, estimatedValue: 2_000_000 },
        { symbol: 'MSFT', side: 'sell', quantity: 1_000, estimatedValue: 500_000 },
        { symbol: 'VTI', side: 'sell', quantity: 4_097, estimatedValue: 1_100_000 },
      ],
    })
    const sector = result.violations.find((v) => v.category === 'sector_limit')!
    expect(sector.severity).toBe('warning')
  })
})

describe('preTradeCheckProposal · request validation', () => {
  it('rejects a leg without a positive notional', async () => {
    await expect(preTradeCheckProposal('user-001', {
      accountId: 'acc-001', trades: [{ symbol: 'VTI', side: 'buy', quantity: 1, estimatedValue: 0 }],
    })).rejects.toThrow()
  })

  it('rejects an unknown account', async () => {
    await expect(preTradeCheckProposal('user-001', {
      accountId: 'acc-999', trades: [{ symbol: 'VTI', side: 'buy', quantity: 1, estimatedValue: 100 }],
    })).rejects.toThrow()
  })
})
