import { describe, it, expect } from 'vitest'
import { preTradeCheck, previewRebalance } from '@/services/oms'
import { checkTradeCompliance } from '@/services/compliance'
import { getAccounts, getTaxLots } from '@/services/custodian'
import { getPositions, getDrift } from '@/services/pms'
import { modelImplementationSecurity } from '@/mocks/handlers/pms'
import { convertCurrency } from '@/lib/currency'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { LONG_TERM_RATE, SHORT_TERM_RATE, taxRateFor } from '@/features/portfolios/tax/shared'

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

  it('C26: the gross tax equals the sum of its trade-level tax impacts, and netting never raises it', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-001'], taxAware: true })
    expect(preview!.grossTaxOnGains)
      .toBeCloseTo(preview!.trades.reduce((s, t) => s + t.taxImpact, 0), 0)
    // The netted figure rounds once, the gross one rounds per leg, so they can differ by up to a
    // dollar per leg when nothing is netted away (acc-001 realises only gains: 32,402 vs 32,401).
    expect(preview!.estimatedTaxImpact).toBeLessThanOrEqual(preview!.grossTaxOnGains + preview!.trades.length)
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
    //
    // Those are the *notionals*. §9.7's final revision states each leg at the lot actually
    // traded, so the figures below are the executed values and sit a little under them:
    //   buys  VTI 108 x 268.50 + EFA 300 x 82.30 + VWO 1,004 x 44.80 + QAI 639 x 35.20 = 121,160
    //         (121,500 - 340; four legs whose unit prices sum to 430.80, so the floor can cost
    //          at most that much)
    //   sells the sell cap follows the executed buys, 121,160 + 13,500 = 134,660, and the lots
    //         then floor it to AGG 956 x 98.50 + BND 247 x 72.40 + GLD 104 x 215.60 = 134,471
    //         (three legs, unit prices summing to 386.50)
    //   net = 134,471 - 121,160 = 13,311, so cash lands at 4.958% — 0.042 of a point under its
    //         5% target, which is the sell side's lot residual and nothing else, and still
    //         inside the two-sided band [2.00%, 5.00%].
    const account = (await getAccounts()).find((a) => a.id === 'acc-004')!
    const [preview] = await previewRebalance({ accountIds: ['acc-004'], taxAware: true })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)

    expect(totalSell).toBe(134_471)
    expect(totalBuy).toBe(121_160)
    expect(totalSell - totalBuy).toBe(13_311)
    // The notional the drift asks for, and the executed figure within one lot-sum of it.
    expect(13_500 - (totalSell - totalBuy)).toBeLessThan(386.50 + 430.80)
    // Nowhere near the $81,000 the unscaled version stranded.
    expect(totalSell - totalBuy).toBeLessThan(20_000)
    // Post-trade cash lands on the 5% target, not 18 points above it. Bounded in **money**
    // against the sell side's lot-sum, not as a weight: a fixed weight tolerance is a threshold
    // chosen for one account size and silently exempts another, which is the same class of error
    // as tolerating a whole share on a share count.
    const endCash = account.cashBalance - totalBuy + totalSell
    const cashTarget = 0.05 * account.totalValue
    expect(cashTarget - endCash).toBeGreaterThanOrEqual(0)
    expect(cashTarget - endCash).toBeLessThan(386.50)
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
    // so nothing is scaled by the caps. The figures asserted are the **executed** ones — each leg
    // stated at the lot actually traded — which sit just under those notionals:
    //   buys  VWO 837 x 44.80 + QAI 1,065 x 35.20 + VNQ 252 x 89.20 = 97,464 (97,500 - 36; three
    //         legs whose unit prices sum to 169.20)
    //   sells VTI 237 x 268.50 + EFA 409 x 82.30 + GLD 104 x 215.60 = 119,718 (the cap follows
    //         the executed buys to 119,964, and lots floor it a further 246; three legs, unit
    //         prices summing to 566.40)
    //   net = 22,254, cash 2.00% -> 4.967%, inside [2.00%, 5.00%] and 0.033 of a point under
    //         target purely from the sell side's lot residual.
    // Round 4's $22,500 was the notional net; what also changed is that the account now fills the
    // three sleeves it was previously stranded out of.
    const { account, trades, totalSell, totalBuy } = await totals('acc-030')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalBuy).toBe(97_464)
    expect(totalSell).toBe(119_718)
    expect(totalSell - totalBuy).toBe(22_254)
    expect(22_500 - (totalSell - totalBuy)).toBeLessThan(169.20 + 566.40)
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(0.05 * account.totalValue - endCash).toBeGreaterThanOrEqual(0)
    expect(0.05 * account.totalValue - endCash).toBeLessThan(566.40)
  })

  it('acc-037 (William Foster, 2.0% cash against a 5% target) nets $30,000 into cash — trimming $160,000 and redeploying $130,000', async () => {
    // Same shape as acc-030 on a $1,000,000 account: notional trims are $160,000 (VTI $85,000 of
    // $348,000 · EFA $45,000 of $145,000 · GLD $30,000 of $50,000), notional buys are
    // (0.05 + 0.05 + 0.03) x $1,000,000 = $130,000, and the cash headroom to target is 3.0
    // points = $30,000, so the caps do not bind. Executed at the lots actually traded:
    //   buys  VWO 1,116 + QAI 1,420 + VNQ 336 = 129,952 (-48 against 130,000; unit prices sum
    //         to 169.20)
    //   sells VTI 316 + EFA 546 + GLD 139 = 159,750 (-250; unit prices sum to 566.40)
    //   net = 29,798, cash 2.00% -> 4.980%, inside [2.00%, 5.00%].
    const { account, trades, totalSell, totalBuy } = await totals('acc-037')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalBuy).toBe(129_952)
    expect(totalSell).toBe(159_750)
    expect(totalSell - totalBuy).toBe(29_798)
    expect(30_000 - (totalSell - totalBuy)).toBeLessThan(169.20 + 566.40)
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(0.05 * account.totalValue - endCash).toBeGreaterThanOrEqual(0)
    expect(0.05 * account.totalValue - endCash).toBeLessThan(566.40)
  })

  it('acc-014 (Williams 529, 2.0% cash against a 10% target) trims the full sleeve, not the $5,775 its lone buy could absorb', async () => {
    // acc-014 does have one buy candidate (VTI, $5,775 notional), so round 3 did not zero it out
    // — it crushed it, capping $36,575 of in-position trims (EFA $17,325 of $55,825 · GLD $19,250
    // of $19,250) to $5,775. The $30,800 of cash headroom on a $385,000 account absorbs the rest.
    //
    // Executed at the lots actually traded: VTI 21 x 268.50 = 5,639 (one leg, so at most 268.50
    // under its notional), and the sell cap follows that executed buy to 5,639 + 30,800 = 36,439
    // before EFA 209 x 82.30 + GLD 88 x 215.60 = 36,174 floors it a further 265 (two legs, unit
    // prices summing to 297.90). Cash lands at 9.931%, inside [2.00%, 10.00%].
    const { account, totalSell, totalBuy } = await totals('acc-014')
    expect(totalBuy).toBe(5_639)
    expect(totalSell).toBe(36_174)
    expect(5_775 - totalBuy).toBeLessThan(268.50)
    expect(36_575 - totalSell).toBeLessThan(268.50 + 297.90)
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(0.10 * account.totalValue - endCash).toBeGreaterThanOrEqual(0)
    expect(0.10 * account.totalValue - endCash).toBeLessThan(297.90)
  })

  it('acc-032 (O\'Brien 529, 2.0% cash against a 10% target) trims the full sleeve, not the $4,275 its lone buy could absorb', async () => {
    // Same shape as acc-014 on a $285,000 account. Notionals $27,075 / $4,275; executed at the
    // lots traded: VTI 15 x 268.50 = 4,028 (one leg, so at most 268.50 under), the sell cap
    // follows to 4,028 + 22,800 = 26,828, and EFA 154 x 82.30 + GLD 65 x 215.60 = 26,688 floors
    // it a further 140 (unit prices summing to 297.90). Cash lands at 9.951%.
    const { account, totalSell, totalBuy } = await totals('acc-032')
    expect(totalBuy).toBe(4_028)
    expect(totalSell).toBe(26_688)
    expect(4_275 - totalBuy).toBeLessThan(268.50)
    expect(27_075 - totalSell).toBeLessThan(268.50 + 297.90)
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(0.10 * account.totalValue - endCash).toBeGreaterThanOrEqual(0)
    expect(0.10 * account.totalValue - endCash).toBeLessThan(297.90)
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
    //   raw sells = intl_equity 0.1898 x 1,500,000 = CHF 284,700, drawn NESN.SW 246,250 (whole
    //               position) then NOVN.SW 38,450; fixed income 0.2872 x 1,500,000 = CHF 430,800,
    //               drawn SRFCHA.SW 221,000 (whole position) then CSBGC0.SW 209,800
    //                                                          = CHF 715,500
    //   buyCapacity = totalSell + cash above target (334,490 - 75,000 = 259,490)
    // so buys scale to that and post-trade cash is exactly CHF 75,000 — the 5% target, reached
    // from above and never overshot. Every leg stays inside the position behind it (long-only).
    //
    // Task 10 — the two drifts are 0.1898/0.2872, not the 0.1894/0.2874 the stored three-decimal
    // weights produced. acc-044's stored weights summed to 0.999, so `computeDriftForAccount`
    // renormalised by 1/0.999; derived, intl_equity is 584,710 / 1,500,000 = 0.389807 and fixed
    // income 580,800 / 1,500,000 = 0.387200 exactly, against targets of 0.20 and 0.10.
    //
    // Executed at the lots traded: sells NESN.SW 2,500 + NOVN.SW 403 + SRFCHA.SW 2,000 +
    // CSBGC0.SW 2,040 = 246,250 + 38,366 + 221,000 + 209,712 = CHF 715,328 (172 under the
    // CHF 715,500 notional; four legs whose unit prices sum to 407.00), and buys VTI 3,173 +
    // VWO 3,804 + QAI 2,420 = 749,716 + 149,969 + 74,962 = CHF 974,647, which is
    // 171 under the cap those buys were actually built against — executedSell 715,328 + cash above
    // target (334,490 - 75,000 = 259,490) = 974,818 — against three legs whose unit prices sum to
    // **CHF** 306.68 (VTI 236.28 + VWO 39.424 + QAI 30.976). The bound here was previously the
    // USD lot-sum 348.50 guarding a CHF quantity, 14% looser than it read: the same
    // wrong-unit error as bounding a money invariant in weight, one currency further down.
    // Cash lands at 334,490 - 974,647 + 715,328 = CHF 75,171, i.e. 5.0114%, inside [5.00%, 22.30%].
    const { account, trades, totalSell, totalBuy } = await totals('acc-044')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalSell).toBe(715_328)
    expect(totalBuy).toBe(974_647)
    expect(totalBuy - totalSell).toBe(259_319)
    expect(715_500 - totalSell).toBeLessThan(407.00)
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(endCash - 0.05 * account.totalValue).toBeGreaterThanOrEqual(0)
    expect(endCash - 0.05 * account.totalValue).toBeLessThan(306.68)
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
    // Read from the fixture rather than re-typed: the position is worth $188,017.50, and a
    // hand-copied bound is a second copy that can drift from the thing it guards.
    const btcPosition = (await getPositions('acc-045')).find((p) => p.symbol === 'BTC')!
    expect(btc.estimatedValue).toBeLessThanOrEqual(Math.round(btcPosition.marketValue))
    // This account is where lot granularity bites hardest, and legibly so: BTC's leg wants
    // 2.1487 units and one unit is $87,450, so it trades 2 and the sleeve executes at $370,372
    // against a $385,050 notional. That single leg is $13,003 of the $14,636 gap; the seven sell
    // legs' unit prices sum to $90,944, which bounds it.
    expect(btc.quantity).toBe(2)
    expect(totalSell).toBe(370_372)
    expect(385_050 - totalSell).toBeLessThan(90_944)
    // buyCapacity follows the money actually raised — 370,372 + (39,870 - 12,750) of cash above
    // target = 397,492 — NOT the 385,008 notional. Reading the notional here bought $411,894
    // against $370,372 raised and drove cash to -0.39%.
    expect(totalBuy).toBe(397_285)
    expect(totalBuy).toBeLessThanOrEqual(totalSell + (39_870 - 12_750))
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(endCash).toBeGreaterThan(0)
    expect(endCash - 0.03 * account.totalValue).toBeGreaterThanOrEqual(0)
    expect(endCash - 0.03 * account.totalValue).toBeLessThan(744.90)
  })

  it('acc-047 (Williams SIMPLE IRA, 8.3% cash against a 5% target) trims $24,507 and redeploys $31,500 into the four sleeves it holds nothing in', async () => {
    // mod-007 asks for emerging markets (5%), alternatives (5%), real estate (3%) and commodities
    // (2%); acc-047 holds VTI, EFA, AGG and BND only. Raw buys = 0.15 x $210,000 = $31,500; raw
    // sells = us_equity 0.0336 + intl_equity 0.0372 + fixed_income 0.0459 = 0.1167 x $210,000 =
    // $24,507; cash above target = $17,510 - $10,500 = $7,010, so buyCapacity = $31,517 and
    // nothing scales.
    //
    // Task 10 — $24,507, not the $24,570 the stored three-decimal weights implied (0.034 + 0.037
    // + 0.046 = 0.117). Derived: VTI 80,550 / 210,000 = 0.383571 (drift 0.0336 against a 0.35
    // target), EFA 28,805 / 210,000 = 0.137167 (0.0372 against 0.10), AGG+BND 83,135 / 210,000 =
    // 0.395881 (0.0459 against 0.35).
    //
    // Executed at the lots traded: sells VTI 26 + EFA 94 + AGG 97 = 6,981 + 7,736 + 9,555 =
    // 24,272 (235 under the 24,507 notional; unit prices summing to 449.30) and buys VWO 232 +
    // QAI 296 + VNQ 70 + GLD 19 = 10,394 + 10,419 + 6,244 + 4,096 = 31,153 (347 under; unit
    // prices summing to 384.80). Cash ends at 17,510 - 31,153 + 24,272 = 10,629, i.e. 5.0614%.
    const { account, trades, totalSell, totalBuy } = await totals('acc-047')
    expect(trades.length).toBeGreaterThan(0)
    expect(totalSell).toBe(24_272)
    expect(totalBuy).toBe(31_153)
    expect(24_507 - totalSell).toBeLessThan(449.30)
    expect(31_500 - totalBuy).toBeLessThan(384.80)
    // Cash falls from 8.34% toward — and not below — its 5% target.
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(endCash / account.totalValue).toBeGreaterThanOrEqual(0.05)
    expect(endCash).toBeLessThan(account.cashBalance)
  })

  it('across every account, a rebalance never pushes cash above the model cash target — in money, at zero tolerance', async () => {
    // The invariant the cap encodes, stated once over all 47 accounts: proceeds may fill the gap
    // to the account's own model cash target but never overshoot it, and an account already
    // above that target is never pushed higher still. A cap that is too generous (no zero floor
    // on the headroom, or headroom measured against the wrong side of the target) breaks this;
    // a cap that is too tight (round 3's `totalBuy` alone) is caught by the named accounts above.
    // The cash target is read from `getDrift`, the same drift surface the proposal derives from.
    //
    // Stated in **money with no tolerance**. This assertion carried a `± 0.0005` *weight*
    // tolerance, which is a different amount of money on every account it covers — $4,100 on
    // acc-001, $6,250 on acc-041, $156 on acc-033 — and it is the whole-book sweeps, not the
    // named-account tests, that this book relies on to be exhaustive. Round 3 converted the
    // named accounts' bounds from weight to money and left these two on weight, which is
    // inverted from where the risk lives: it let acc-033 finish 0.0098 of a point **more**
    // overweight cash than it started (45,937 against a 45,861 ceiling, $76 the wrong way)
    // while both sweeps reported clean. Nothing needs a tolerance here — `estimatedValue` is an
    // integer number of currency units and the bound is a product of two exact fixture figures.
    const violations: string[] = []
    let examined = 0
    for (const account of await getAccounts()) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
      const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
      if (totalSell === 0) continue
      examined++
      const drift = await getDrift(account.id)
      const cashTarget = drift.assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0
      const ceiling = Math.max(cashTarget * account.totalValue, account.cashBalance)
      const endCash = account.cashBalance - totalBuy + totalSell
      if (endCash > ceiling) {
        violations.push(`${account.id}: end ${endCash.toFixed(2)} above ceiling ${ceiling.toFixed(2)} by ${(endCash - ceiling).toFixed(2)}`)
      }
    }
    // Vacuity guard: an empty book would satisfy the loop above without examining anything.
    expect(examined).toBeGreaterThan(30)
    expect(violations).toEqual([])
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
    const target = (await getDrift('acc-043')).assetClassDrifts.find((d) => d.assetClass === 'cash')!.target
    // In money, at zero tolerance. The `- 0.0002` weight tolerance this replaces was worth €640
    // on this account — more than three CSBGU0.SW lots — for an invariant whose whole content is
    // "cash does not fall below the target". There is nothing for a tolerance to absorb: both
    // sides are exact fixture arithmetic.
    expect(cash - buy + sell).toBeGreaterThanOrEqual(target * account.totalValue)
  })

  it('every account: post-trade cash lands within its own target band, from both directions, in money at zero tolerance', async () => {
    // Both halves in **money**, with no tolerance. This is the sweep that is supposed to be
    // exhaustive, and it carried a `± 0.0002` weight tolerance — $20 on acc-040, $156 on
    // acc-033, $900 on acc-002, $2,500 on acc-041, i.e. more than three whole VTI lots on the
    // largest account in the book. It reported clean while acc-033 ended $76 above its own
    // starting cash balance, moving *away* from a target it was already overweight against.
    // A weight tolerance is the wrong unit for a money invariant.
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
      const target = (await getDrift(account.id)).assetClassDrifts.find((d) => d.assetClass === 'cash')?.target ?? 0
      const targetValue = target * account.totalValue
      const floor = Math.min(cash, targetValue)
      const ceiling = Math.max(cash, targetValue)
      const end = cash - buy + sell
      // FLOOR — the assertion the Phase 1 sweep was missing.
      if (end < floor) {
        violations.push(`${account.id}: end ${end.toFixed(2)} below floor ${floor.toFixed(2)} by ${(floor - end).toFixed(2)}`)
      }
      // CEILING — the assertion it did make; both must hold.
      if (end > ceiling) {
        violations.push(`${account.id}: end ${end.toFixed(2)} above ceiling ${ceiling.toFixed(2)} by ${(end - ceiling).toFixed(2)}`)
      }
    }
    // Vacuity guard: prove accounts were actually examined, not that every preview was empty.
    expect(examined).toBeGreaterThan(30)
    expect(violations).toEqual([])
  })

  it('acc-033: an account already overweight cash is not made MORE overweight by the flooring on the other side', async () => {
    // The case both whole-book sweeps missed while they were stated in weight. acc-033 holds
    // $45,861 of cash on a $780,000 account — 5.8796% against a 5.00% target, so it is *already*
    // overweight and the only legal direction for its cash is down (or, at worst, nowhere).
    //
    //   raw   totalSell = 4,290 (intl_equity, EFA)     totalBuy = 4,212 (fixed_income, AGG)
    //   buy   AGG  floor(4,212 / 98.50) = 42  ->  42 x 98.50  = 4,137
    //   sell  EFA  floor(4,137 / 82.30) = 50  ->  50 x 82.30  = 4,115
    //   end   45,861 - 4,137 + 4,115 = 45,839   (22 below the start, and 6,839 above the target)
    //
    // Task 10 — the two notionals are 4,290 and 4,212, not the 4,602 and 4,134 the stored
    // three-decimal weights gave. acc-033's stored weights summed to 1.001, so
    // `computeDriftForAccount` renormalised by 1/1.001; derived, intl_equity is 82,300 / 780,000
    // = 0.105513 (drift +0.0055 against a 0.10 target, x 780,000 = 4,290) and fixed_income is
    // 268,810 / 780,000 = 0.344628 (drift -0.0054 against 0.35, x 780,000 = 4,212).
    //
    // Sizing the sell cap on the pre-floor `totalBuy` of 4,134 instead sold 50 EFA for 4,115
    // against 4,039 of buys and left the account at $45,937 — $76 *above* where it started, on
    // an overweight of only 0.88 of a point. Both bounds are the executed figure now.
    const account = (await getAccounts()).find((a) => a.id === 'acc-033')!
    const [preview] = await previewRebalance({ accountIds: ['acc-033'], taxAware: true })
    const trades = preview!.trades
    const totalSell = trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(trades.length).toBeGreaterThan(0)
    expect(totalBuy).toBe(4_137)
    expect(totalSell).toBe(4_115)
    const endCash = account.cashBalance - totalBuy + totalSell
    expect(endCash).toBeLessThanOrEqual(account.cashBalance)
    expect(endCash).toBeGreaterThanOrEqual(0.05 * account.totalValue)
    // Vacuity guard on the premise: it really does start overweight, so "cash may only fall" is
    // the live constraint and not a statement about an account moving the other way.
    expect(account.cashBalance).toBeGreaterThan(0.05 * account.totalValue)
    // And the sells really are bounded by the *executed* buys, not by the 4,212 notional: one
    // more EFA lot (82.30) would have cleared 4,197, which is what the pre-floor cap allowed.
    expect(totalSell).toBeLessThanOrEqual(totalBuy)
    expect(totalBuy - totalSell).toBeLessThan(82.30)
  })

  // The named-account tests above and the whole-book sweep never actually exercise the
  // `Math.max(0, …)` floor on `cashAboveTarget`: at the Rebalance page's default 0.005
  // threshold, no account's raw buy total is large enough, relative to its cash-to-target gap,
  // for the floored and unfloored figures to diverge. A tighter threshold (more asset classes
  // clear the drift bar, so `totalBuy` grows) surfaces it. acc-015 is 0.59 points under its 3%
  // cash target on a $4.2M account (a $24,635 gap: 101,365 of CASH against 0.03 x 4,200,000 =
  // 126,000) with $113,820 of raw buys at
  // `driftThreshold: 0.001` — without the floor, `cashAboveTarget` goes negative
  // (-$24,635 instead of $0), pulling `buyCapacity` from $136,488 down to $111,853 and scaling
  // every buy to 98.27 cents on the dollar. With the floor, `buyCapacity` stays at $136,488 — the
  // full $113,820 goes through, unscaled.
  it('acc-015 at a tight drift threshold: the floor on cashAboveTarget lets the whole buy through, not 98.27 cents on the dollar', async () => {
    // $113,820 of notional buys (intl_equity 0.0128 + emerging_markets 0.0020 + alternatives
    // 0.0123 = 0.0271 x $4,200,000), executed as EFA 653 + VWO 187 + QAI 1,467 = 53,742 + 8,378
    // + 51,638 = $113,758 — 62 under, against three legs whose unit prices sum to 162.30. The
    // figure this test defends is the *unscaled* one: a cash-first reservation would cap it at
    // $111,853, more than a lot-sum away.
    //
    // Task 10 — the executed split moved (EFA 668 / QAI 1,431 before) because the drifts the legs
    // are sized from are now derived: intl_equity 575,900 / 4,200,000 = 0.137167 against a 0.15
    // target, alternatives 158,400 / 4,200,000 = 0.037714 against 0.05. The $113,820 total is
    // unchanged; only its distribution across the three sleeves is.
    const [preview] = await previewRebalance({ accountIds: ['acc-015'], taxAware: true, driftThreshold: 0.001 })
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(totalBuy).toBe(113_758)
    expect(113_820 - totalBuy).toBeLessThan(162.30)
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
    // acc-015 holds $101,365 of cash on a $4.2M account: 2.4135% against a 3% target, a $24,635
    // shortfall. At `driftThreshold: 0.001` it raises $136,488 and its sleeves want $113,820.
    // Reserving the cash shortfall first would cap buys at $136,488 - $24,635 = $111,853
    // (98.27 cents on the dollar) and land cash on exactly 3.00%. It does not: every sleeve
    // dollar goes through and cash ends at (101,365 - 113,758 + 136,488) / 4,200,000 = 2.9546%,
    // still under target — moving toward it, never past it, and never at the sleeves' expense.
    //
    // Task 10 — $136,488 raised, not $135,185: the sell notional is us_equity 0.0104 +
    // fixed_income 0.0221 = 0.0325 x $4,200,000 = $136,500, executed as INTC 1,535 x 28.45 =
    // 43,671 and BND 1,282 x 72.40 = 92,817.
    const account = (await getAccounts()).find((a) => a.id === 'acc-015')!
    const [preview] = await previewRebalance({ accountIds: ['acc-015'], taxAware: true, driftThreshold: 0.001 })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    const target = (await getDrift('acc-015')).assetClassDrifts.find((d) => d.assetClass === 'cash')!.target
    const startCashPct = account.cashBalance / account.totalValue
    const endCashPct = (account.cashBalance - totalBuy + totalSell) / account.totalValue

    // The premise: this account really is short of its cash target, or the test proves nothing.
    expect(startCashPct).toBeLessThan(target)
    expect(totalSell).toBe(136_488)
    // Sleeves first: the whole buy, not the $111,853 a cash-first reservation would allow. The
    // $62 shortfall against the $113,820 notional is lot granularity (three legs, unit prices
    // summing to 162.30); the $1,967 a cash-first cap would remove is not. The lower bound is the
    // cash-first cap itself, so this discriminates against exactly the behaviour it names — a
    // round number below it would pass on the wrong answer.
    expect(totalBuy).toBe(113_758)
    expect(totalBuy).toBeGreaterThan(111_853)
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
      expect(sell.estimatedValue).toBeLessThanOrEqual(Math.round(position!.marketValue))
    }
    // And specifically: not the 9,912,500 the unscaled version proposed against 0700.HK. The bound
    // is that position's own market value, read from the fixture — the previous `5_000_000` was
    // above the HK$4,560,000 position it was protecting, so a 4.9M sell would have breached
    // long-only and still passed this line.
    const largestPosition = positions.find((p) => p.symbol === '0700.HK')!
    expect(Math.max(...sells.map((s) => s.estimatedValue))).toBeLessThanOrEqual(Math.round(largestPosition.marketValue))
  })

  it('acc-006: sells nothing (BXPE is periodic-liquidity) and funds its buys from the $412,470 of cash above its 5% target', async () => {
    // acc-006's model (mod-005) is underweight us_equity/intl_equity/alternatives and overweight
    // private_equity (BXPE, not in the model at all) and cash. The only raw sell was $542,400 of
    // BXPE, but BXPE redeems only at periodic repurchase windows, so a rebalance does not sell it
    // (isMarketTradable) — sells are $0. Raw buys are unchanged at $920,400 (SPY $82,800 + EFA
    // $93,600 + QAI $744,000, derived on the $12,000,000 account from the sleeve drifts below).
    //
    // The buy capacity is what sells raise plus cash above target: $0 + (1,012,470 - 5% x
    // 12,000,000 = 600,000) = $412,470. Buys scale by 412,470 / 920,400 = 0.4482, and each leg
    // rounds down to whole shares: SPY 71 x 520.30 = 36,941 + EFA 509 x 82.30 = 41,891 + QAI
    // 9,472 x 35.20 = 333,414 = 412,246 (224 under the capacity, inside one share of each leg).
    // Sleeve drifts: us_equity 4,116,680 / 12,000,000 = 0.343057 (-0.0069 vs 0.35 = 82,800);
    // intl_equity 1,706,750 / 12,000,000 = 0.142229 (-0.0078 vs 0.15 = 93,600); alternatives
    // 1,056,000 / 12,000,000 = 0.088 (-0.062 vs 0.15 = 744,000).
    const [preview] = await previewRebalance({ accountIds: ['acc-006'], taxAware: true })
    const totalSell = preview!.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const totalBuy = preview!.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(totalSell).toBe(0)
    expect(totalBuy).toBe(412_246)
    expect(412_470 - totalBuy).toBeGreaterThanOrEqual(0)
    expect(412_470 - totalBuy).toBeLessThan(520.30)
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
        // Exact, with no tolerance at all. The `+ 1` this replaces was worth **one whole unit of
        // USDC** ($1.00) and 0.12 of a DOT — an absolute threshold spanning asset classes, the
        // same shape as the `+ 1` share tolerance that hid a live oversell. No tolerance is
        // needed: `estimatedValue` is `Math.round(quantity x price)` and `quantity x price` is
        // capped at the position's market value, and `Math.round` is monotone, so
        // `estimatedValue <= Math.round(marketValue)` holds identically. It is the rounding that
        // needed accounting for, not slack — acc-002's ETHE leg is 71,623 against a 71,622.90
        // position, and 71,623 is exactly `Math.round(71,622.90)`.
        expect(trade.estimatedValue, `${account.id} ${trade.symbol}`).toBeLessThanOrEqual(Math.round(position.marketValue))
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
 * notional walk the production code performs — not a re-statement of `realiseSale` itself.
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

/**
 * §9.7 round 4 · the rendered row carries three numbers for one trade — `quantity`, `estimatedValue`
 * and `taxImpact` — and all three must describe the *same* trade. Round 3 moved `estimatedValue`
 * onto executed money (`Math.round(quantity x price)`) and left `taxImpact` on the pre-floor
 * notional, so acc-045's BTC leg rendered `quantity 2 · $174,900 · tax $10,231` with the tax
 * estimated on $187,895 — 7.4% more BTC than the row says is being sold. 48 taxed sell legs were
 * affected book-wide; the per-leg exposure is bounded by `unitPrice / estimatedValue`, which is
 * 50.0% on acc-045's BTC, 7.7% on acc-040's GLD and 4.6% on acc-045's ETH.
 *
 * These run **tax-unaware** on purpose: `realiseSale` re-orders lots by tax-per-dollar when
 * the toggle is on, and reproducing that sort in the test would make this a copy of the function
 * rather than a check on it. Unaware, the walk is the fixture's own lot order, so what is actually
 * under test is the *argument* — which figure the tax is computed from — and not the algorithm.
 * The ordering itself is pinned separately (the acc-002 and toggle tests above).
 */
describe('§9.7 round 4 · the tax on a row is the tax on the value that row states', () => {
  const taxOnLots = (lots: { currentValue: number; gainLoss: number; holdingPeriod: 'short' | 'long' }[], value: number) => {
    let remaining = value
    let tax = 0
    for (const lot of lots) {
      if (remaining <= 0 || lot.currentValue <= 0) continue
      const portion = Math.min(1, remaining / lot.currentValue)
      const gain = lot.gainLoss * portion
      if (gain > 0) tax += gain * taxRateFor(lot.holdingPeriod)
      remaining -= lot.currentValue * portion
    }
    return Math.max(0, Math.round(tax))
  }

  it('acc-045 BTC: 2 units at $174,900, taxed on $174,900 — not on the notional the lot was floored from', async () => {
    const [preview] = await previewRebalance({ accountIds: ['acc-045'], taxAware: false })
    const btc = preview!.trades.find((t) => t.symbol === 'BTC' && t.side === 'sell')!
    const position = (await getPositions('acc-045')).find((p) => p.symbol === 'BTC')!
    const lots = (await getTaxLots('acc-045')).filter((l) => l.positionId === position.id)
    expect(lots.length).toBeGreaterThan(0)
    expect(btc.quantity).toBe(2)
    expect(btc.estimatedValue).toBe(174_900)
    expect(btc.taxImpact).toBe(taxOnLots(lots, btc.estimatedValue))
    // The direction that makes the assertion above mean something: one BTC unit is $87,450, half
    // this leg's executed value, so the walk is anything but insensitive to the figure it is
    // handed. Taxing the whole position instead of the two units traded is a different number.
    expect(taxOnLots(lots, position.marketValue)).toBeGreaterThan(btc.taxImpact)
  })

  it('every taxed account book-wide: each sell leg\'s tax is the lot walk over that leg\'s own estimatedValue', async () => {
    const mismatches: string[] = []
    let legsChecked = 0
    let lotSensitiveLegs = 0
    for (const account of await getAccounts()) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: false })
      // Tax-exempt accounts are zero on every leg by design (`isTaxableAccount`), and a lot walk
      // over their positions would not be; they are covered by their own tests above.
      // Gated on the gross figure: netting can offset an account's gains entirely (net estimate 0)
      // while its legs still carry per-leg tax that this test checks.
      if (!preview || preview.grossTaxOnGains <= 0) continue
      const positions = await getPositions(account.id)
      const allLots = await getTaxLots(account.id)
      for (const trade of preview.trades) {
        if (trade.side !== 'sell') continue
        const position = positions.find((p) => p.symbol === trade.symbol)
        if (!position) continue
        const lots = allLots.filter((l) => l.positionId === position.id)
        if (lots.length === 0) continue
        legsChecked++
        const onTheRow = taxOnLots(lots, trade.estimatedValue)
        if (trade.taxImpact !== onTheRow) {
          mismatches.push(`${account.id} ${trade.symbol}: tax ${trade.taxImpact}, but the row's own ${trade.estimatedValue} implies ${onTheRow}`)
        }
        // Sensitivity: adding a single lot's worth of value changes the answer, so equality above
        // is a real constraint on the argument rather than a walk that returns the same number
        // for any input near it.
        if (taxOnLots(lots, trade.estimatedValue + position.price) !== onTheRow) lotSensitiveLegs++
      }
    }
    expect(legsChecked).toBeGreaterThan(30)
    expect(lotSensitiveLegs).toBeGreaterThan(20)
    expect(mismatches).toEqual([])
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
    // acc-002 is 12.22 points overweight us_equity on a $4.5M account — an implied $549,900 trim,
    // against INTC ($199,150, a $45,850 unrealised loss), SPY ($2,018,243.70, a $355,206.70 gain)
    // and QQQ ($807,372.80, a $179,114.80 gain). Ranked by gain per dollar of market value:
    // INTC -23.0%, SPY +17.6%, QQQ +22.2%.
    //
    // "Prefer losses, then the smallest embedded gain" is an ordering drawn from until the
    // sleeve is filled, not a single pick: INTC sells out entirely ($199,150), then SPY tops the
    // rest up ($350,682). Stopping at INTC would leave the account overweight us_equity after a
    // rebalance that reported success — tax-better and rebalance-worse, which is not the trade
    // an advisor would accept when both are available.
    const [preview] = await previewRebalance({ accountIds: ['acc-002'], taxAware: true })
    const usEquitySells = preview!.trades.filter((t) => t.side === 'sell' && ['SPY', 'QQQ', 'INTC'].includes(t.symbol))
    // Vacuity guard — an empty list would mean the sleeve produced no sell at all and every
    // assertion below would be testing nothing.
    expect(usEquitySells.length).toBeGreaterThan(0)
    // Order, not just membership: the loss lot is reached first.
    expect(usEquitySells.map((t) => t.symbol)).toEqual(['INTC', 'SPY'])
    // INTC goes in full before SPY is touched at all — 7,000 shares, the whole position.
    expect(usEquitySells[0]!.estimatedValue).toBe(199_150)
    expect(usEquitySells[0]!.quantity).toBe(7_000)
    // ...and the sleeve is filled to its drift, not left short at the loss position's size.
    // Task 10 — the trim is 0.1222 x 4,500,000 = 549,900, not the 547,650 the stored
    // three-decimal weights gave: us_equity is SPY 2,018,243.70 + QQQ 807,372.80 + INTC 199,150 =
    // 3,024,766.50 of 4,500,000 = 0.672170, and 0.672170 - 0.55 = 0.1222 to four places.
    // Executed: 199,150 + SPY 674 x 520.30 = 350,682, total 549,832, which is 68 under the
    // 549,900 notional — two legs whose unit prices sum to 548.75, so that is lot granularity,
    // not a short fill.
    const usEquityTotal = usEquitySells.reduce((s, t) => s + t.estimatedValue, 0)
    expect(usEquityTotal).toBe(549_832)
    expect(549_900 - usEquityTotal).toBeLessThan(28.45 + 520.30)
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
    // INTC — so SPY alone absorbs the whole $549,900 trim and the loss lot is never reached.
    const unawareUsEquity = unaware!.trades.filter((t) => t.side === 'sell' && ['SPY', 'QQQ', 'INTC'].includes(t.symbol))
    expect(unawareUsEquity.map((t) => t.symbol)).toEqual(['SPY'])
    // The 180 SMH bought 2026-02-21 (pos-265, $44,136) are us_equity, so the sleeve is 0.681978
    // of 4,500,000 and the trim is 0.1320 x 4,500,000 = 594,000. 1,141 shares x 520.30 = 593,662,
    // within one SPY lot of that notional. The bound is restated against the new notional: left at
    // 549,900 it would have been satisfied by a *negative* difference and stopped discriminating.
    expect(unawareUsEquity[0]!.estimatedValue).toBe(593_662)
    expect(594_000 - unawareUsEquity[0]!.estimatedValue).toBeLessThan(520.30)
    expect(594_000 - unawareUsEquity[0]!.estimatedValue).toBeGreaterThan(0)
    expect(aware!.trades.some((t) => t.side === 'sell' && t.symbol === 'INTC')).toBe(true)
    expect(unaware!.trades.some((t) => t.side === 'sell' && t.symbol === 'INTC')).toBe(false)
  })

  it('the tax-aware ordering is confined to taxable accounts — a tax-deferred account is unmoved by the toggle', async () => {
    // acc-047 is a SIMPLE IRA: gains are not taxed, `realiseSale` already returns 0, and
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

  it('acc-045: a sell out of a fractional crypto position never names more units than the account owns', async () => {
    // The defect a `+ 1` tolerance in the sweep above hid. `Math.round(notional / price)` rounds
    // a share count UP: acc-045 holds 22.5 ETH and 15,231.5 USDC, and the engine proposed selling
    // 23 ETH and 15,232 USDC — more than exists, which a custodian rejects. The value cap held
    // throughout ($73,800 of ETH is exactly its market value), so only the share count was wrong.
    // `boundedTradeQty` (custodian.ts) is the codebase's one rounding policy for this and floors
    // to the cap instead.
    const positions = await getPositions('acc-045')
    const fractional = positions.filter((p) => !Number.isInteger(p.quantity))
    // Vacuity guard: this account must really hold fractional units, or the test proves nothing.
    expect(fractional.map((p) => p.symbol)).toEqual(expect.arrayContaining(['BTC', 'ETH', 'USDC']))

    const [preview] = await previewRebalance({ accountIds: ['acc-045'], taxAware: true })
    const sells = preview!.trades.filter((t) => t.side === 'sell')
    expect(sells.length).toBeGreaterThan(0)
    for (const sell of sells) {
      const position = positions.find((p) => p.symbol === sell.symbol)!
      expect(sell.quantity, `${sell.symbol}: ${sell.quantity} units against ${position.quantity} held`)
        .toBeLessThanOrEqual(position.quantity)
    }
    // The two legs that were wrong, named: 22 ETH of the 22.5 held (not 23), 15,231 USDC of the
    // 15,231.5 held (not 15,232).
    expect(sells.find((t) => t.symbol === 'ETH')!.quantity).toBe(22)
    expect(sells.find((t) => t.symbol === 'USDC')!.quantity).toBe(15_231)
  })

  it('every proposed trade multiplies out: quantity x price reconciles to the estimated value, on every leg in the book', async () => {
    // The Phase 1 charter defect in its plainest form — two numbers describing one trade,
    // disagreeing on the same rendered row. `PreviewTradesStep` shows quantity and estimated
    // value side by side, so an advisor reading "buy 15 VTI · $4,275" can multiply 15 x $268.50
    // and find $247 that is not there. That is exactly what flooring the quantity while leaving
    // `estimatedValue` as the un-floored notional produced: 25 of 273 legs off by more than 0.5%,
    // the worst by 5.8%.
    //
    // Checked **relatively**, deliberately. An absolute threshold of one unit price is $87,450 for
    // BTC and $1.00 for USDC — wide enough to exempt the very asset class most at risk, which is
    // the same tolerance-swallowing failure as allowing a whole share on a share count.
    const accountList = await getAccounts()
    const mismatches: string[] = []
    let legsChecked = 0
    let worstRelative = 0
    for (const account of accountList) {
      const [preview] = await previewRebalance({ accountIds: [account.id], taxAware: true })
      if (!preview?.trades.length) continue
      const positions = await getPositions(account.id)
      const drift = await getDrift(account.id)
      for (const trade of preview.trades) {
        // The price the engine used: the held position's, or the model sleeve's own quote
        // converted into the account's currency for a class the account holds nothing in.
        const held = positions.find((p) => p.symbol === trade.symbol)
        const sleeve = drift.assetClassDrifts
          .map((d) => modelImplementationSecurity(drift.modelId, d.assetClass))
          .find((s) => s?.symbol === trade.symbol)
        const price = held?.price
          ?? (sleeve ? convertCurrency(sleeve.price, 'USD', preview.currency, FX_RATES_USD_BASE) : undefined)
        if (price === undefined) {
          mismatches.push(`${account.id} ${trade.symbol}: no price source`)
          continue
        }
        legsChecked++
        const relative = Math.abs(trade.quantity * price - trade.estimatedValue) / Math.max(1, trade.estimatedValue)
        worstRelative = Math.max(worstRelative, relative)
        // 0.1% absorbs the single `Math.round` to whole currency units and nothing more.
        if (relative > 0.001) {
          mismatches.push(
            `${account.id} ${trade.side} ${trade.symbol}: ${trade.quantity} x ${price} = ` +
            `${(trade.quantity * price).toFixed(0)} vs estimatedValue ${trade.estimatedValue} ` +
            `(${(relative * 100).toFixed(2)}% off)`,
          )
        }
      }
    }
    // Vacuity guard — `mismatches` is empty both when every leg reconciles and when none was
    // examined. This must cover essentially the whole book, not a handful of legs.
    expect(legsChecked).toBeGreaterThan(200)
    expect(mismatches).toEqual([])
    // And the residual really is sub-cent rounding, not a tolerance being leaned on.
    expect(worstRelative).toBeLessThan(0.0005)
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
          // Neither bound carries a tolerance now. The share count never did — a whole share of
          // slack is not rounding, it is an overshoot, and this assertion was written with `+ 1`
          // and reported clean while acc-045 proposed selling 23 ETH against a 22.5 ETH holding
          // and 15,232 USDC against 15,231.5. The **value** bound kept a `$1` tolerance for
          // cent-level rounding, and $1 is exactly one whole unit of USDC and 0.12 of a DOT — the
          // same absolute-threshold-across-asset-classes shape, surviving one line down. Rounding
          // is accounted for by rounding the bound rather than by widening it: `estimatedValue`
          // is `Math.round(quantity x price)`, `quantity x price <= marketValue`, and `Math.round`
          // is monotone.
          expect(trade.estimatedValue).toBeLessThanOrEqual(Math.round(position!.marketValue))
          expect(trade.quantity, `${account.id} ${trade.symbol} sells more units than held`)
            .toBeLessThanOrEqual(position!.quantity)
        }
      }
    }
    // Vacuity guard — if the engine proposed nothing anywhere, every assertion above ran zero
    // times and this test would pass while proving nothing.
    expect(tradesChecked).toBeGreaterThan(100)
  })
})
