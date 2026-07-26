import { describe, it, expect } from 'vitest'
import { preTradeCheck, previewRebalance } from '@/services/oms'
import { checkTradeCompliance } from '@/services/compliance'
import { getAccounts, getTaxLots } from '@/services/custodian'
import { getPositions, getDrift } from '@/services/pms'
import { modelImplementationSecurity } from '@/mocks/handlers/pms'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { LONG_TERM_RATE, SHORT_TERM_RATE } from '@/features/portfolios/tax/shared'

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

  // Minor fix round 3 — this commit introduced the cash `block` severity (round 1/2 only ever
  // warned); neither `block` branch had a dedicated test, so mutating either to always return
  // 'warning' killed nothing.
  it('cash reserve severity is "block" once the projected post-trade cash would go negative', async () => {
    // acc-001 cashBalance 660,170; a $1.2M buy leaves -$539,830.
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'AAPL', side: 'buy', quantity: 6_142, estimatedValue: 1_200_000,
    })
    const cash = result.violations.find((v) => v.constraint.includes('Cash reserve'))!
    expect(cash).toBeDefined()
    expect(cash.severity).toBe('block')
  })

  it('sector concentration severity is "block" once the projected weight exceeds the 40% limit outright', async () => {
    // acc-001's 19.2% existing tech weight plus a $2M AAPL buy projects to 43.6%.
    const result = await preTradeCheck({
      accountId: 'acc-001', symbol: 'AAPL', side: 'buy', quantity: 10_237, estimatedValue: 2_000_000,
    })
    const sector = result.violations.find((v) => v.constraint.includes('Sector concentration'))!
    expect(sector).toBeDefined()
    expect(sector.severity).toBe('block')
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
  it('acc-004: sells net exactly the cash shortfall to target, not the ~18% of the account the unscaled version parked in cash', async () => {
    // acc-004 (Roth IRA, $450K, $9,000 cash = 2.0% against a 5% target) — before the round-2 fix
    // the account sold $135,000 and bought only $54,000, parking the $81,000 (18% of the account)
    // difference in cash. Round 4 restated the invariant to "the net sale fills the cash gap and
    // does not exceed it": acc-004 is 3.0 points under its cash target, so a net sale of exactly
    // $13,500 lands cash on 5.00%.
    //
    // §9.7 leaves that figure intact and shows why (Global Constraint 7). Raw buys grew from
    // $54,000 to $121,500 — the emerging_markets ($45,000) and alternatives ($22,500) sleeves are
    // now reachable — and raw sells grew to match, because an overweight sleeve is now drawn down
    // across its candidates in preference order instead of stopping at the first: fixed income is
    // 25.0 points overweight, an implied $112,500, and AGG's $94,500 position no longer caps it —
    // BND absorbs the remaining $18,000. Raw sells are therefore $135,000, not $117,000.
    //
    //   sellCapacity = totalBuy $121,500 + cash headroom $13,500 = $135,000 -> nothing scales
    //   buyCapacity  = totalSell $135,000 + cash above target $0 = $135,000 > $121,500 -> ditto
    //   net = 135,000 - 121,500 = 13,500 -> cash 2.00% -> 5.00% exactly
    const account = (await getAccounts()).find((a) => a.id === 'acc-004')!
    const [preview] = await previewRebalance({ accountIds: ['acc-004'], taxAware: true })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)

    expect(totalSell).toBeCloseTo(135_000, -1)
    expect(totalBuy).toBeCloseTo(121_500, -1)
    expect(totalSell - totalBuy).toBeCloseTo(13_500, -1)
    // Nowhere near the $81,000 the unscaled version stranded.
    expect(totalSell - totalBuy).toBeLessThan(20_000)
    // Post-trade cash lands on the 5% target, not 18 points above it.
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.05, 3)
  })
})

/**
 * Critical fix round 4 · rebalancing — round 3 capped sells at `totalBuy` alone. `cash` is an
 * asset class in every model with its own target weight, but it never yields a tradeable
 * candidate (`p.symbol !== 'CASH'` filters it out), so cash can never contribute to `totalBuy`.
 * Any account whose only underweight classes were ones it does not hold, plus cash, therefore got
 * `sellScale = 0` and proposed nothing at all — 8 of 41 drifted accounts at the Rebalance page's
 * default threshold, up from 0 of 41 in round 2.
 *
 * Four of those eight are *overweight* cash (acc-041/044/045/047), so refusing is right and is
 * covered below. Four were a live regression: these accounts are **underweight** cash and hold
 * overweight positions comfortably inside their market value that an advisor could legitimately
 * trim. The cap is `totalBuy + max(0, cashTarget - cashActual) x totalValue` — an account can
 * absorb proceeds into cash, up to its cash target, exactly as it can draw on cash to fund a buy.
 *
 * Each test below names its account, because the pre-existing acc-041 test cannot distinguish
 * "capped correctly" from "capped too hard" — both leave acc-041 proposing nothing.
 */
describe('fix round 4 · sells are capped by what buys AND cash-to-target can absorb, not by buys alone', () => {
  async function totals(accountId: string) {
    const account = (await getAccounts()).find((a) => a.id === accountId)!
    const [preview] = await previewRebalance({ accountIds: [accountId], taxAware: true })
    const trades = preview!.trades
    const totalSell = trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    return { account, trades, totalSell, totalBuy }
  }

  it('acc-030 (Brian O\'Brien, 2.0% cash against a 5% target) nets $22,500 into cash — now by trimming $120,000 and redeploying $97,500, not by trimming $22,500 and buying nothing', async () => {
    // Restated by §9.7, with the arithmetic (Global Constraint 7). The round-4 figures rested on
    // a premise §9.7 removes: "every underweight class acc-030 has — emerging_markets,
    // alternatives, real_estate — is one it holds nothing in, so totalBuy is exactly 0". Those
    // three sleeves now have a reachable implementation security, so:
    //
    //   raw buys  = (0.05 EM + 0.05 ALT + 0.03 RE) x $750,000 = $97,500  (VWO, QAI, VNQ)
    //   raw sells = VTI $63,750 (of a $261,000 position) + EFA $33,750 (of $108,750)
    //               + GLD $22,500 (of $37,500)                          = $120,000
    //   sellCapacity = totalBuy $97,500 + cash headroom $22,500 (3.0 pts of $750,000) = $120,000
    //
    // so nothing is scaled: all $120,000 of legitimate in-position trims go through, $97,500 is
    // redeployed into the sleeves the model actually asks for, and the $22,500 remainder is
    // exactly the cash gap. The **net** figure round 4 pinned is unchanged; what changed is that
    // the account now also fills the three sleeves it was previously stranded out of.
    const { account, trades, totalSell, totalBuy } = await totals('acc-030')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalBuy).toBeCloseTo(97_500, -2)
    expect(totalSell).toBeCloseTo(120_000, -2)
    expect(totalSell - totalBuy).toBeCloseTo(22_500, -2)
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.05, 3)
  })

  it('acc-037 (William Foster, 2.0% cash against a 5% target) nets $30,000 into cash — trimming $160,000 and redeploying $130,000', async () => {
    // Same shape as acc-030 on a $1,000,000 account: raw trims are $160,000 (VTI $85,000 of
    // $348,000 · EFA $45,000 of $145,000 · GLD $30,000 of $50,000), raw buys are
    // (0.05 + 0.05 + 0.03) x $1,000,000 = $130,000, and the cash headroom to target is 3.0
    // points = $30,000, so sellCapacity = $160,000 and nothing scales. Net into cash: $30,000 —
    // round 4's figure, reached by a proposal that now also fills EM/alternatives/real estate.
    const { account, trades, totalSell, totalBuy } = await totals('acc-037')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalBuy).toBeCloseTo(130_000, -2)
    expect(totalSell).toBeCloseTo(160_000, -2)
    expect(totalSell - totalBuy).toBeCloseTo(30_000, -2)
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.05, 3)
  })

  it('acc-014 (Williams 529, 2.0% cash against a 10% target) trims the full $36,575, not the $5,775 its lone buy could absorb', async () => {
    // acc-014 does have one buy candidate (VTI, $5,775), so round 3 did not zero it out — it
    // crushed it, capping $36,575 of in-position trims (EFA $17,325 of $55,825 · GLD $19,250 of
    // $19,250) to $5,775. The $30,800 of cash headroom on a $385,000 account absorbs the rest.
    const { account, totalSell, totalBuy } = await totals('acc-014')
    expect(totalBuy).toBeCloseTo(5_775, -1)
    expect(totalSell).toBeCloseTo(36_575, -2)
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.10, 3)
  })

  it('acc-032 (O\'Brien 529, 2.0% cash against a 10% target) trims the full $27,075, not the $4,275 its lone buy could absorb', async () => {
    const { account, totalSell, totalBuy } = await totals('acc-032')
    expect(totalBuy).toBeCloseTo(4_275, -1)
    expect(totalSell).toBeCloseTo(27_075, -2)
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.10, 3)
  })

  // §9.7 restates the three tests below. Round 4 asserted `trades === []` for acc-044, acc-045 and
  // acc-047 — correct **while** the engine could only trade what an account already held: each is
  // overweight cash (so proceeds had nowhere to go) AND holds nothing in any of its underweight
  // sleeves (so there was nothing to buy), leaving `sellCapacity = 0`. §9.7 removes the second
  // half of that: the sleeves are now reachable, so all three spend their surplus cash down to
  // target instead of sitting on it. The property round 4 was defending survives intact and is
  // asserted below in its own right — cash never rises above where it started — and the
  // whole-book two-sided sweep further down covers every account.

  it('acc-044 (Mueller CHF, 22.3% cash against a 5% target) deploys its cash surplus down to exactly the 5% target', async () => {
    // mod-004 wants 50% us_equity, 10% emerging markets and 5% alternatives; acc-044 holds none
    // of the three, and is overweight intl_equity (38.9% vs 20%) and fixed income (38.7% vs 10%).
    //   raw buys  = (0.50 + 0.10 + 0.05) x CHF 1,500,000 = CHF 975,000 (VTI, VWO, QAI)
    //   raw sells = intl_equity 0.1894 x 1,500,000 = CHF 283,500, drawn NESN.SW 246,250 (whole
    //               position) then NOVN.SW 37,250; fixed income 0.2874 x 1,500,000 = CHF 431,100,
    //               drawn SRFCHA.SW 221,000 (whole position) then CSBGC0.SW 210,100
    //                                                          = CHF 714,600
    //   buyCapacity = totalSell + cash above target (334,490 - 75,000 = 259,490)
    // so buys scale to that and post-trade cash is exactly CHF 75,000 — the 5% target, reached
    // from above and never overshot. Every leg stays inside the position behind it (long-only).
    const { account, trades, totalSell, totalBuy } = await totals('acc-044')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalSell).toBeCloseTo(715_200, -2)
    expect(totalBuy).toBeCloseTo(974_690, -2)
    expect(totalBuy - totalSell).toBeCloseTo(259_490, -2)
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.05, 4)
    // The round-4 property, restated: cash falls toward target, it is never pushed up.
    expect(account.cashBalance - totalBuy + totalSell).toBeLessThan(account.cashBalance)
  })

  it('acc-045 (Patel Digital Assets, 9.4% cash against a 3% target) exits its whole digital-asset overweight in loss-first order — never a $384,625 sale of a $188,018 BTC position', async () => {
    // digital_assets is 90.6% of the account against a 0% target in mod-002, an implied $385,050
    // trim. Round 3 would have proposed all of it against BTC alone — a $384,625 sell of a
    // $188,018 position. The long-only cap is per leg, so the sleeve is drawn down across all
    // seven holdings in ascending gain-per-dollar order, BTC (+22.9%, the largest embedded gain
    // per dollar held) last and only partially:
    //   DOT -19.0% · SOL -17.0% · USDC 0.0% · ETH +16.0% · AVAX +16.0% · LINK +18.3% · BTC +22.9%
    const { account, trades, totalSell, totalBuy } = await totals('acc-045')
    const sells = trades.filter((t) => t.side === 'sell')
    expect(trades.length).toBeGreaterThan(0)
    // Loss lots first, and the largest embedded gain last — the ordering, not just the membership.
    expect(sells.map((t) => t.symbol)).toEqual(['DOT', 'SOL', 'USDC', 'ETH', 'AVAX', 'LINK', 'BTC'])
    const btc = sells.find((t) => t.symbol === 'BTC')!
    expect(btc.estimatedValue).toBeLessThanOrEqual(188_017.50)
    expect(totalSell).toBeCloseTo(385_008, -2)
    // buyCapacity = 385,008 raised + (39,870 - 12,750) of cash above target.
    expect(totalBuy).toBeCloseTo(412_128, -2)
    expect((account.cashBalance - totalBuy + totalSell) / account.totalValue).toBeCloseTo(0.03, 4)
  })

  it('acc-047 (Williams SIMPLE IRA, 8.3% cash against a 5% target) trims $24,570 and redeploys $31,500 into the four sleeves it holds nothing in', async () => {
    // mod-007 asks for emerging markets (5%), alternatives (5%), real estate (3%) and commodities
    // (2%); acc-047 holds VTI, EFA, AGG and BND only. Raw buys = 0.15 x $210,000 = $31,500; raw
    // sells = VTI $7,140 + EFA $7,770 + AGG $9,660 = $24,570; cash above target = $17,510 -
    // $10,500 = $7,010, so buyCapacity = $31,580 and nothing scales.
    const { account, trades, totalSell, totalBuy } = await totals('acc-047')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalSell).toBeCloseTo(24_570, -1)
    expect(totalBuy).toBeCloseTo(31_500, -1)
    // Cash falls from 8.34% toward — and not below — its 5% target.
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(endCash / account.totalValue).toBeGreaterThanOrEqual(0.05)
    expect(endCash).toBeLessThan(account.cashBalance)
  })

  it('across every account, a rebalance never pushes cash above the model cash target', async () => {
    // The invariant the cap encodes, stated once over all 47 accounts: proceeds may fill the gap
    // to the account's own model cash target but never overshoot it, and an account already
    // above that target is never pushed higher still. A cap that is too generous (no zero floor
    // on the headroom, or headroom measured against the wrong side of the target) breaks this;
    // a cap that is too tight (round 3's `totalBuy` alone) is caught by the named accounts above.
    // The cash target is read from `getDrift`, the same drift surface the proposal derives from.
    for (const account of await getAccounts()) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
      const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
      if (totalSell === 0) continue
      const drift = await getDrift(account.id)
      const cashTarget = drift.assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0
      const startCashPct = account.cashBalance / account.totalValue
      const endCashPct = (account.cashBalance - totalBuy + totalSell) / account.totalValue
      expect(endCashPct, `${account.id} target ${cashTarget} start ${startCashPct} end ${endCashPct}`)
        .toBeLessThanOrEqual(Math.max(cashTarget, startCashPct) + 0.0005)
    }
  })
})

describe('§9.6 · buys are capped by available cash above target, symmetric to the sell cap', () => {
  it('acc-043: rebalancing does not drive cash from 13.69% to 5.56% against a 10% target', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-043'], taxAware: true })
    const positions = await getPositions('acc-043')
    const account = (await getAccounts()).find((a) => a.id === 'acc-043')!
    const cash = positions.find((p) => p.symbol === 'CASH')!.marketValue
    const sell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const buy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    const endWeight = (cash - buy + sell) / account.totalValue
    const target = (await getDrift('acc-043')).assetClassDrifts.find((d) => d.assetClass === 'cash')!.target
    expect(endWeight).toBeGreaterThanOrEqual(target - 0.0002)
  })

  it('every account: post-trade cash lands within its own target band, from both directions', async () => {
    const accounts = await getAccounts()
    const violations: string[] = []
    let examined = 0
    for (const account of accounts) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      if (!preview?.trades.length) continue
      examined++
      const positions = await getPositions(account.id)
      const cash = positions.find((p) => p.symbol === 'CASH')?.marketValue ?? 0
      const sell = preview.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
      const buy = preview.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
      const startW = cash / account.totalValue
      const endW = (cash - buy + sell) / account.totalValue
      const target = (await getDrift(account.id)).assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0
      // FLOOR — the assertion the Phase 1 sweep was missing.
      if (endW < Math.min(startW, target) - 0.0002) {
        violations.push(`${account.id}: cash fell to ${(endW * 100).toFixed(2)}% below min(start ${(startW * 100).toFixed(2)}%, target ${(target * 100).toFixed(2)}%)`)
      }
      // CEILING — the assertion it did make; both must hold.
      if (endW > Math.max(startW, target) + 0.0002) {
        violations.push(`${account.id}: cash rose to ${(endW * 100).toFixed(2)}% above max(start, target)`)
      }
    }
    // Vacuity guard: prove accounts were actually examined, not that every preview was empty.
    expect(examined).toBeGreaterThan(0)
    expect(violations).toEqual([])
  })

  // The named-account tests above and the whole-book sweep never actually exercise the
  // `Math.max(0, …)` floor on `cashAboveTarget`: at the Rebalance page's default 0.005
  // threshold, no account's raw buy total is large enough, relative to its cash-to-target gap,
  // for the floored and unfloored figures to diverge. A tighter threshold (more asset classes
  // clear the drift bar, so `totalBuy` grows) surfaces it. acc-015 is 0.6 points under its 3%
  // cash target on a $4.2M account (a $25,301 gap) with $113,820 of raw buys at
  // `driftThreshold: 0.001` — without the floor, `cashAboveTarget` goes negative
  // (-$25,301 instead of $0), pulling `buyCapacity` from $135,240 down to $109,939 and scaling
  // every buy to 96.59 cents on the dollar. With the floor, `buyCapacity` stays at $135,240 — the
  // full $113,820 goes through, unscaled.
  it('acc-015 at a tight drift threshold: the floor on cashAboveTarget lets the full $113,820 buy through, not 96.59 cents on the dollar', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-015'], taxAware: true, driftThreshold: 0.001 })
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(totalBuy).toBeCloseTo(113_820, -1)
  })

  /**
   * §9.7 · the funding-priority decision, named. When proceeds cannot cover both the underweight
   * return-seeking sleeves and an underweight cash target, **cash is funded last** — it absorbs
   * what the sleeves cannot take and is never reserved out of proceeds ahead of them. This is
   * what the `Math.max(0, …)` floor on `cashAboveTarget` encodes; the test above pins the dollar
   * figure, this one pins the *reason*, so the choice cannot revert as a silent side effect of
   * re-ordering. The full rationale (and the pro-rata alternative that was rejected) is in
   * `oms.ts` at the `cashAboveTarget` definition.
   */
  it('acc-015 at a tight drift threshold: cash is funded LAST — the sleeves are filled in full and cash lands wherever the residual leaves it, below its own target', async () => {
    // acc-015 holds $101,365 of cash on a $4.2M account: 2.413% against a 3% target, a $24,635
    // shortfall. At `driftThreshold: 0.001` it raises $135,240 and its sleeves want $113,820.
    // Reserving the cash shortfall first would cap buys at $135,240 - $24,635 = $110,605
    // (96.59 cents on the dollar) and land cash on exactly 3.00%. It does not: every sleeve
    // dollar goes through and cash ends at 2.923%, still under target — moving toward it, never
    // past it, and never at the sleeves' expense.
    const account = (await getAccounts()).find((a) => a.id === 'acc-015')!
    const [preview] = await previewRebalance({ accountIds: ['acc-015'], taxAware: true, driftThreshold: 0.001 })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    const target = (await getDrift('acc-015')).assetClassDrifts.find((d) => d.assetClass === 'cash')!.target
    const startCashPct = account.cashBalance / account.totalValue
    const endCashPct = (account.cashBalance - totalBuy + totalSell) / account.totalValue

    // The premise: this account really is short of its cash target, or the test proves nothing.
    expect(startCashPct).toBeLessThan(target)
    expect(totalSell).toBeCloseTo(135_240, -1)
    // Sleeves first: the full raw buy, not the $110,605 a cash-first reservation would allow.
    expect(totalBuy).toBeCloseTo(113_820, -1)
    expect(totalBuy).toBeGreaterThan(111_000)
    // Cash last: it rises toward target and stops short of it, rather than being topped up.
    expect(endCashPct).toBeGreaterThan(startCashPct)
    expect(endCashPct).toBeLessThan(target)
  })
})

describe('fix round 3 · self-financing applies to sells only — buys are never capped to match sells', () => {
  it('acc-041: never proposes more than the position is worth — the 2.2x short sale on 0700.HK stays impossible even now that the account trades', async () => {
    // Restated by §9.7 (Global Constraint 7). Round 3 pinned `trades === []` here: acc-041 (HKD)
    // was underweight every class it holds nothing in (us_equity, emerging_markets, fixed_income,
    // alternatives, commodities — none had a tradable candidate), so `totalBuy` was 0 and, being
    // overweight cash too, it had nowhere to put proceeds. §9.7 gives those five sleeves a
    // reachable implementation security, so the account does now trade — and its 94.4%
    // international equity against a 15% target, the largest single drift in the book, is
    // finally acted on rather than silently ignored.
    //
    // The property round 3 was actually defending is the one asserted here, and it is unchanged:
    // the implied intl_equity trim is 0.7939 x HK$12,500,000 = HK$9,923,750, and no sell may
    // exceed the market value of the position behind it. The old `totalBuy > 0 &&` guard would
    // have proposed HK$9,912,500 of 0700.HK against a HK$4,560,000 position — 2.2x, a short sale
    // in a long-only demo.
    const [preview] = await previewRebalance({ accountIds: ['acc-041'], taxAware: true })
    const positions = await getPositions('acc-041')
    const sells = preview!.trades.filter((t) => t.side === 'sell')
    expect(preview!.trades.length).toBeGreaterThan(0)
    // Vacuity guard: the per-sell bound below is meaningless if there are no sells.
    expect(sells.length).toBeGreaterThan(0)
    for (const sell of sells) {
      const position = positions.find((p) => p.symbol === sell.symbol)
      expect(position, `acc-041 ${sell.symbol} sell with no position`).toBeDefined()
      expect(sell.estimatedValue).toBeLessThanOrEqual(position!.marketValue + 1)
    }
    // And specifically: not the 9,912,500 the unscaled version proposed.
    expect(Math.max(...sells.map((s) => s.estimatedValue))).toBeLessThan(5_000_000)
  })

  it('acc-006: buys the full $912,000 (funded from its own $1,012,470 cash balance), not scaled down to the $540,000 raised from selling BXPE', async () => {
    // acc-006's model (mod-005) is underweight us_equity/intl_equity/alternatives and overweight
    // private_equity (BXPE, not in the model at all) and cash. Raw sells: $540,000 (BXPE). Raw
    // buys: $912,000 (SPY $72,000 + EFA $96,000 + QAI $744,000). The regression scaled buys down
    // to match the $540,000 raised from selling, leaving both the cash overweight (8.4% vs 5%
    // target) and the alternatives underweight (8.8% vs 15% target) uncorrected.
    const [preview] = await previewRebalance({ accountIds: ['acc-006'], taxAware: true })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(totalSell).toBeCloseTo(540_000, -3)
    expect(totalBuy).toBeCloseTo(912_000, -3)
  })
})

describe('fix round 3 · rebalance sells never exceed the position actually held (long-only, no short sales)', () => {
  it('across every account with a proposal, no sell trade exceeds that position\'s real market value', async () => {
    const accountList = await getAccounts()
    for (const account of accountList) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      const sells = preview!.trades.filter((t) => t.side === 'sell')
      if (sells.length === 0) continue
      const positions = await getPositions(account.id)
      for (const trade of sells) {
        const position = positions.find((p) => p.symbol === trade.symbol)
        if (!position) continue
        expect(trade.estimatedValue, `${account.id} ${trade.symbol}`).toBeLessThanOrEqual(position.marketValue + 1)
      }
    }
  })
})

/**
 * Important fix round 4 (review's #4) · a flat `0.238` (or flat `0.37`) rate leaves the existing
 * C26 tests green: `toBeGreaterThanOrEqual` is satisfied by two equal flat-rate numbers, and the
 * aware/unaware comparison can't distinguish a flat rate from a per-lot one because both branches
 * read the same `taxRateFor`. These are golden-model cross-checks (the same pattern
 * `drift-invariants.test.ts` uses) against a *fixed*, single rate applied to the same lot-by-lot
 * notional walk the production code performs — not a re-statement of `estimateSaleTax` itself.
 */
describe('fix round 3 · rebalance tax uses each lot\'s own holding-period rate, not a flat rate', () => {
  it('acc-040: GLD has only short-term lots, so its sell tax must exceed what a flat 23.8% long-term rate would produce', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-040'], taxAware: false })
    const gld = preview!.trades.find((t) => t.symbol === 'GLD' && t.side === 'sell')
    expect(gld).toBeDefined()
    expect(gld!.taxImpact).toBeGreaterThan(0)

    const positions = await getPositions('acc-040')
    const gldPosition = positions.find((p) => p.symbol === 'GLD')!
    const lots = (await getTaxLots('acc-040')).filter((l) => l.positionId === gldPosition.id)
    // Sanity: this account's fixture case is genuinely all short-term, so a flat long-term rate
    // is the correct thing to compare against.
    expect(lots.length).toBeGreaterThan(0)
    expect(lots.every((l) => l.holdingPeriod === 'short')).toBe(true)

    let remaining = gld!.estimatedValue
    let naiveLongTermTax = 0
    for (const lot of lots) {
      if (remaining <= 0 || lot.currentValue <= 0) continue
      const portion = Math.min(1, remaining / lot.currentValue)
      const gain = lot.gainLoss * portion
      if (gain > 0) naiveLongTermTax += gain * LONG_TERM_RATE
      remaining -= lot.currentValue * portion
    }
    expect(gld!.taxImpact).toBeGreaterThan(Math.round(naiveLongTermTax))
  })

  it('acc-001: VTI\'s sale is covered entirely by its long-term lot, so its sell tax must be below what a flat 37% short-term rate would produce', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: false })
    const vti = preview!.trades.find((t) => t.symbol === 'VTI' && t.side === 'sell')
    expect(vti).toBeDefined()
    expect(vti!.taxImpact).toBeGreaterThan(0)

    const positions = await getPositions('acc-001')
    const vtiPosition = positions.find((p) => p.symbol === 'VTI')!
    const lots = (await getTaxLots('acc-001')).filter((l) => l.positionId === vtiPosition.id)
    expect(lots.some((l) => l.holdingPeriod === 'long')).toBe(true)

    let remaining = vti!.estimatedValue
    let naiveShortTermTax = 0
    for (const lot of lots) {
      if (remaining <= 0 || lot.currentValue <= 0) continue
      const portion = Math.min(1, remaining / lot.currentValue)
      const gain = lot.gainLoss * portion
      if (gain > 0) naiveShortTermTax += gain * SHORT_TERM_RATE
      remaining -= lot.currentValue * portion
    }
    expect(vti!.taxImpact).toBeLessThan(Math.round(naiveShortTermTax))
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
    // §9.2, pinning current semantics deliberately (not a defect either way): a warning-severity
    // breach — a position approaching, not yet over, its limit — still suppresses the affirmative
    // "All post-trade positions..." pass. Only a fully clean projection gets the affirmative pass.
    expect(result!.checks.some((c) => c.category === 'concentration_limit' && c.status === 'pass')).toBe(false)
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

describe('§9.2 · compliance reports the whole projected book, not only proposed buys', () => {
  it('acc-002: a clean AGG buy does not certify SPY, which is already over the fund limit', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-002', trades: [{ symbol: 'AGG', side: 'buy', quantity: 100, estimatedValue: 10_000 }] },
    ])
    const concentration = result!.checks.filter((c) => c.category === 'concentration_limit')
    // The affirmative all-positions pass must not appear while a real breach exists.
    expect(concentration.some((c) => c.status === 'pass' && /All post-trade positions/.test(c.message))).toBe(false)
    // SPY is 44.8% against a 35% fund limit and must be named.
    const spy = concentration.find((c) => c.details?.symbol === 'SPY')
    expect(spy, 'SPY breach must be reported').toBeDefined()
    expect(spy!.details!.preExisting).toBe(true)
    expect(spy!.details!.postTradeWeight).toBeGreaterThan(0.35)
  })

  it('a pre-existing breach is reported as pre-existing, not blamed on the trade', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-002', trades: [{ symbol: 'AGG', side: 'buy', quantity: 100, estimatedValue: 10_000 }] },
    ])
    const spy = result!.checks.find((c) => c.details?.symbol === 'SPY')!
    expect(spy.message).toMatch(/already|pre-existing|not created by this trade/i)
  })

  it('an account with no breach anywhere still gets a clean affirmative pass', async () => {
    // The direction that matters: this must not become a check that can never pass. Asserting
    // only `.every(status === 'pass')` would be vacuously true on an empty array — if the
    // affirmative pass check were deleted outright and nothing else breaches, `concentration`
    // would be `[]` and `.every` would still report true. Pin that the array is non-empty and
    // that the affirmative pass rule specifically is present.
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-006', trades: [{ symbol: 'AGG', side: 'buy', quantity: 10, estimatedValue: 1_000 }] },
    ])
    const concentration = result!.checks.filter((c) => c.category === 'concentration_limit')
    expect(concentration.length).toBeGreaterThan(0)
    expect(concentration.every((c) => c.status === 'pass')).toBe(true)
    expect(concentration.some((c) => c.rule === 'Concentration limit (per security kind)')).toBe(true)
  })

  it('a trade that creates a breach is distinguished from one that inherits it', async () => {
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-006', trades: [{ symbol: 'NVDA', side: 'buy', quantity: 2_000, estimatedValue: 1_560_000 }] },
    ])
    const nvda = result!.checks.find((c) => c.details?.symbol === 'NVDA')!
    expect(nvda.details!.preExisting).toBe(false)
  })

  it('a sell that reduces a pre-existing breach below its limit is reported as cured, not still breaching', async () => {
    // acc-002 SPY: weight 0.448 against the 35% fund limit ($2,018,243.70 of the $4.5M account).
    // Selling $666,000 (0.148 of the account) projects SPY to exactly 0.300 — below the 35% limit
    // but still above the 28% warn threshold, so the check must survive as a 'warning', not a
    // 'fail' and not vanish. A sell-blind projection (one that only applies buys, carrying every
    // held position's weight forward unchanged) would leave SPY at 0.448 and still report 'fail'
    // here — that is exactly the mutation this test exists to kill.
    const [result] = await checkTradeCompliance([
      { accountId: 'acc-002', trades: [{ symbol: 'SPY', side: 'sell', quantity: 1_280, estimatedValue: 666_000 }] },
    ])
    const concentration = result!.checks.filter((c) => c.category === 'concentration_limit')
    const spy = concentration.find((c) => c.details?.symbol === 'SPY')
    expect(spy, 'SPY concentration check must be reported').toBeDefined()
    expect(spy!.status).toBe('warning')
    expect(spy!.details!.postTradeWeight).toBeCloseTo(0.300, 3)
    expect(spy!.details!.postTradeWeight).toBeLessThan(0.35)
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

/**
 * §9.7 · rebalancing reaches classes the account does not yet hold, and chooses the security
 * deliberately. `oms.ts` used to build candidates only from positions the account already held and
 * always take `candidates[0]`. Two consequences: acc-041 proposed **nothing** while 94.4%
 * international equity against a 15% target, because every class it needed to buy was one it held
 * zero of; and where the engine did propose, it never chose *which* security to trade — acc-002
 * trimmed SPY (a $355,206.70 embedded gain) while INTC sat in the same asset class with a $45,850
 * unrealised loss, so the "tax-aware" toggle picked a materially worse tax outcome than an obvious
 * loss lot already in the account.
 */
describe('§9.7 · rebalancing reaches classes the account does not yet hold', () => {
  it('acc-041: 94.4% international equity against a 15% target proposes real trades, including buys', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-041'], taxAware: true })
    expect(preview!.trades.length).toBeGreaterThan(0)
    expect(preview!.trades.some((t) => t.side === 'buy')).toBe(true)
    // The direction that matters: the buys are in classes acc-041 holds NOTHING of. A test that
    // only counted trades would pass on an all-sell proposal, which is the state this fixes.
    const positions = await getPositions('acc-041')
    const heldSymbols = new Set(positions.map((p) => p.symbol))
    const unheldBuys = preview!.trades.filter((t) => t.side === 'buy' && !heldSymbols.has(t.symbol))
    expect(unheldBuys.length).toBeGreaterThan(0)
    expect(unheldBuys.map((t) => t.symbol)).toContain('VTI')
  })

  it('acc-041 (HKD): an unheld buy is sized at the security\'s price converted into the account currency, not at its raw USD price', async () => {
    // The currency trap. Notionals derive from `account.totalValue`, which is native currency
    // (HK$12,500,000), while VTI is quoted at US$268.50. Dividing an HKD notional by a USD price
    // gives a share count 7.82x too large that means nothing in either currency.
    const [preview] = await previewRebalance({ accountIds: ['acc-041'], taxAware: true })
    const vti = preview!.trades.find((t) => t.symbol === 'VTI')
    expect(vti, 'acc-041 must buy the mod-002 us_equity sleeve').toBeDefined()
    expect(vti!.currency).toBe('HKD')

    const usdPrice = 268.50
    const hkdPrice = convertCurrency(usdPrice, 'USD', 'HKD', FX_RATES_USD_BASE)
    // quantity x HKD price reconciles to the HKD notional, within one share of rounding.
    expect(Math.abs(vti!.quantity * hkdPrice - vti!.estimatedValue)).toBeLessThan(hkdPrice)
    // ...and the unconverted count does not. Without this second assertion the first would still
    // pass under a mutation that converted the *notional* instead of the price.
    const unconvertedQuantity = vti!.estimatedValue / usdPrice
    expect(Math.abs(unconvertedQuantity - vti!.quantity)).toBeGreaterThan(hkdPrice / usdPrice)
    expect(unconvertedQuantity / vti!.quantity).toBeCloseTo(FX_RATES_USD_BASE.HKD, 1)
  })

  it('tax-aware selection exhausts the loss position before touching the large-gain one, and still fills the whole sleeve', async () => {
    // acc-002 is 12.17 points overweight us_equity on a $4.5M account — an implied $547,650 trim,
    // against INTC ($199,150, a $45,850 unrealised loss), SPY ($2,018,243.70, a $355,206.70 gain)
    // and QQQ ($807,372.80, a $179,114.80 gain). Ranked by gain per dollar of market value:
    // INTC -23.0%, SPY +17.6%, QQQ +22.2%.
    //
    // "Prefer losses, then the smallest embedded gain" is an ordering drawn from until the
    // sleeve is filled, not a single pick: INTC sells out entirely ($199,150), then SPY tops the
    // rest up ($348,500). Stopping at INTC would leave the account overweight us_equity after a
    // rebalance that reported success — tax-better and rebalance-worse, which is not the trade
    // an advisor would accept when both are available.
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const usEquitySells = preview!.trades.filter((t) => t.side === 'sell' && ['SPY', 'QQQ', 'INTC'].includes(t.symbol))
    // Vacuity guard — an empty list would mean the sleeve produced no sell at all and every
    // assertion below would be testing nothing.
    expect(usEquitySells.length).toBeGreaterThan(0)
    // Order, not just membership: the loss lot is reached first.
    expect(usEquitySells.map((t) => t.symbol)).toEqual(['INTC', 'SPY'])
    // INTC goes in full before SPY is touched at all.
    expect(usEquitySells[0]!.estimatedValue).toBeCloseTo(199_150, -1)
    // ...and the sleeve is filled to its drift, not left short at the loss position's size.
    expect(usEquitySells.reduce((s, t) => s + t.estimatedValue, 0)).toBeCloseTo(547_650, -2)
    // QQQ, the largest gain per dollar, is never reached — the ordering has to mean something.
    expect(usEquitySells.some((t) => t.symbol === 'QQQ')).toBe(false)
  })

  it('tax-aware off does not silently produce the same selection', async () => {
    // The direction that matters: if both toggle states pick identically, the toggle does nothing
    // and the previous test proves nothing about tax-awareness.
    const [aware] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const [unaware] = await previewRebalance({ accountIds: ['acc-002'], taxAware: false })
    expect(JSON.stringify(aware!.trades)).not.toBe(JSON.stringify(unaware!.trades))
    // Named, not just different. Tax-unaware keeps the fixture's declaration order — SPY, QQQ,
    // INTC — so SPY alone absorbs the whole $547,650 trim and the loss lot is never reached.
    const unawareUsEquity = unaware!.trades.filter((t) => t.side === 'sell' && ['SPY', 'QQQ', 'INTC'].includes(t.symbol))
    expect(unawareUsEquity.map((t) => t.symbol)).toEqual(['SPY'])
    expect(unawareUsEquity[0]!.estimatedValue).toBeCloseTo(547_650, -2)
    expect(aware!.trades.some((t) => t.side === 'sell' && t.symbol === 'INTC')).toBe(true)
    expect(unaware!.trades.some((t) => t.side === 'sell' && t.symbol === 'INTC')).toBe(false)
  })

  it('the tax-aware ordering is confined to taxable accounts — a tax-deferred account is unmoved by the toggle', async () => {
    // acc-047 is a SIMPLE IRA: gains are not taxed, `estimateSaleTax` already returns 0, and
    // re-ranking its sleeves by embedded gain would be an arbitrary preference wearing a
    // tax-awareness label. Its two toggle states must therefore be identical — and the toggle
    // must still bite on the taxable account above, or this is asserting that the toggle is dead.
    const [aware] = await previewRebalance({ accountIds: ['acc-047'], taxAware: true })
    const [unaware] = await previewRebalance({ accountIds: ['acc-047'], taxAware: false })
    expect(aware!.trades.length).toBeGreaterThan(0)
    expect(JSON.stringify(aware!.trades)).toBe(JSON.stringify(unaware!.trades))
  })

  it('every buy is either a position the account holds or its model\'s own implementation security', async () => {
    // A buy in a symbol that is neither is a fabricated ticker — the failure mode this whole task
    // risks introducing.
    const accountList = await getAccounts()
    let buysChecked = 0
    for (const account of accountList) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      if (!preview?.trades.length) continue
      const positions = await getPositions(account.id)
      const held = new Set(positions.map((p) => p.symbol))
      const drift = await getDrift(account.id)
      const sleeveSymbols = new Set(
        drift.assetClassDrifts
          .map((d) => modelImplementationSecurity(drift.modelId, d.assetClass)?.symbol)
          .filter((s): s is string => Boolean(s)),
      )
      for (const trade of preview.trades.filter((t) => t.side === 'buy')) {
        buysChecked++
        expect(held.has(trade.symbol) || sleeveSymbols.has(trade.symbol), `${account.id} ${trade.symbol}`).toBe(true)
      }
    }
    expect(buysChecked).toBeGreaterThan(50)
  })

  it('no proposed sell exceeds the position held, no trade is a zero-share order, and no preview repeats a symbol', async () => {
    const accountList = await getAccounts()
    let tradesChecked = 0
    for (const account of accountList) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      const positions = await getPositions(account.id)
      const seen = new Set<string>()
      for (const trade of preview?.trades ?? []) {
        tradesChecked++
        expect(trade.estimatedValue, `${account.id} ${trade.symbol}`).toBeGreaterThan(0)
        // A buy priced at a symbol with no quote yields a notional the engine cannot turn into
        // shares; a zero-share order is the visible symptom.
        expect(trade.quantity, `${account.id} ${trade.symbol} zero-share order`).toBeGreaterThan(0)
        // `PreviewTradesStep` keys its rows on `trade.symbol`; a repeat would drop a row silently.
        expect(seen.has(trade.symbol), `${account.id} ${trade.symbol} duplicated in one preview`).toBe(false)
        seen.add(trade.symbol)
        if (trade.side === 'sell') {
          const position = positions.find((p) => p.symbol === trade.symbol)
          expect(position, `${account.id} ${trade.symbol} sell with no position`).toBeDefined()
          expect(trade.estimatedValue).toBeLessThanOrEqual(position!.marketValue + 1)
          expect(trade.quantity).toBeLessThanOrEqual(position!.quantity + 1)
        }
      }
    }
    // Vacuity guard — if the engine proposed nothing anywhere, every assertion above ran zero
    // times and this test would pass while proving nothing.
    expect(tradesChecked).toBeGreaterThan(100)
  })
})
