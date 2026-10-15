import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTaxLots, getOpenWashSaleWindows } from '@/services/custodian'
import { getPositions } from '@/services/pms'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { boundedTradeQty, generateTransactions } from '@/mocks/handlers/custodian'
import { realizedSales, washSaleWindow, openWashSaleWindows } from '@/mocks/data/realized-sales'
import {
  taxRateFor,
  SHORT_TERM_RATE,
  LONG_TERM_RATE,
  COLLECTIBLE_LONG_TERM_RATE,
  HARVEST_LOSS_THRESHOLD_USD,
  isHarvestable,
  RATE_DISCLOSURE,
  buildRateDisclosure,
} from '@/lib/tax-rules'

const ACCOUNTS = ['acc-001', 'acc-002', 'acc-011', 'acc-020', 'acc-029', 'acc-041', 'acc-042', 'acc-043', 'acc-044']

const transactionsOf = (accountId: string) =>
  generateTransactions(accountId, accounts.find((a) => a.id === accountId)!.totalValue)

describe('tax lots partition their positions', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(ACCOUNTS)('%s: lots sum to their position on every dimension', async (accountId) => {
    const [lots, positions] = await Promise.all([getTaxLots('user-001', accountId), getPositions('user-001', accountId)])
    for (const position of positions.filter((p) => p.symbol !== 'CASH')) {
      const forPosition = lots.filter((l) => l.positionId === position.id)
      expect(forPosition.length, `${position.symbol} has no lots`).toBeGreaterThan(0)
      expect(forPosition.reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(position.quantity, 6)
      expect(forPosition.reduce((s, l) => s + l.costBasis, 0)).toBeCloseTo(position.costBasis, 0)
      expect(forPosition.reduce((s, l) => s + l.currentValue, 0)).toBeCloseTo(position.marketValue, 0)
      expect(forPosition.reduce((s, l) => s + l.gainLoss, 0)).toBeCloseTo(position.gainLoss, 0)
    }
  })

  it('C12: lots are deterministic across calls', async () => {
    const first = await getTaxLots('user-001', 'acc-001')
    const second = await getTaxLots('user-001', 'acc-001')
    expect(second).toEqual(first)
  })

  it('C12: gainLoss === currentValue − costBasis for every lot', async () => {
    const lots = await getTaxLots('user-001', 'acc-002')
    for (const lot of lots) {
      expect(lot.gainLoss).toBeCloseTo(lot.currentValue - lot.costBasis, 0)
    }
  })

  it.each(ACCOUNTS)('%s: holdingPeriod follows the purchase date against the clock', async (accountId) => {
    const lots = await getTaxLots('user-001', accountId)
    for (const lot of lots) {
      const months = (new Date(MOCK_TODAY_ISO).getTime() - new Date(lot.purchaseDate).getTime())
        / (1000 * 60 * 60 * 24 * 365.25 / 12)
      expect(lot.holdingPeriod).toBe(months > 12 ? 'long' : 'short')
    }
  })

  // Round-1 review, Minor #4: acc-001 alone never exercises the §1222 boundary. acc-011 has lots
  // exactly 12 months old (e.g. lot-pos-071-1) — a real fixture case, not a synthetic one.
  it('C12: the §1222 boundary is exercised by the fixture and classified short-term', async () => {
    const lots = await getTaxLots('user-001', 'acc-011')
    const boundaryLots = lots.filter((l) => l.purchaseDate === '2025-02-25')
    expect(boundaryLots.length, 'fixture no longer produces a lot exactly 12 months old').toBeGreaterThan(0)
    for (const lot of boundaryLots) {
      expect(lot.holdingPeriod).toBe('short')
    }
  })

  // Round-1 review, Important #2: local getMonth/setMonth on a UTC anchor baked the host
  // timezone's day-of-month into the result, so 417/605 lot dates differed between machines.
  // vi.stubEnv (not process.env directly — this project has no @types/node) changes the
  // timezone Node's Date reads for subsequent calls, so this exercises the real bug: the same
  // computation, replayed across a UTC-negative, UTC, and UTC-positive zone.
  it('C12: lot purchase dates do not depend on the host timezone', async () => {
    const zones = ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']
    const byZone = new Map<string, string[]>()
    for (const tz of zones) {
      vi.stubEnv('TZ', tz)
      const lots = await getTaxLots('user-001', 'acc-001')
      byZone.set(tz, lots.map((l) => l.purchaseDate))
    }
    const [firstZone, ...restZones] = zones
    const expected = byZone.get(firstZone!)!
    for (const tz of restZones) {
      expect(byZone.get(tz)).toEqual(expected)
    }
  })

  it('D33: transactions are deterministic and priced consistently with the position', async () => {
    const first = transactionsOf('acc-001')
    const second = transactionsOf('acc-001')
    expect(second).toEqual(first)
    for (const txn of first.filter((t) => t.type === 'buy' || t.type === 'sell')) {
      expect(txn.price).toBeGreaterThan(0)
      expect(Math.abs(txn.amount)).toBeCloseTo(txn.quantity! * txn.price!, 0)
    }
  })

  // Round-1 review, Important #1: sourcing price from the real position (correct) blew out the
  // blast radius of the pre-existing unbounded quantity draw — sells could exceed the position
  // held by 10-80x. Swept across all 47 accounts because the violations the reviewer found
  // (acc-010, 013, 014, 021, 031, 034, 036, 039, 040, 045) are outside the 9-account ACCOUNTS list.
  //
  // RETIRED (task 14 follow-up, C14): this assertion compared a sell to the position's *current*
  // quantity, which was a reasonable proxy only because every symbol's running balance started at
  // zero and every trade in the 60-day window was itself bounded by that same running balance —
  // under that model "currently held" and "held at any point in the window" always coincided.
  // Seeding an opening balance (`current quantity + total quantity sold in the window`) to make
  // `realizedSales` injectable breaks that coincidence on purpose: acc-007 legitimately sells 300
  // NVDA while holding 0 today, because it sold all 300. The property this assertion was actually
  // guarding — a sell can never exceed what the account held *at the time of the sale* — is the
  // one already, and more correctly, covered below by "D33: no transaction implies a negative
  // running balance for its symbol", which replays the balance chronologically instead of
  // comparing against a single present-day snapshot. Loosening this assertion (e.g. widening the
  // bound) rather than retiring it would have re-certified the defect it was written to catch, so
  // it is deleted, not weakened.

  // Round-2 review, Important: bounding only sells left buys unbounded, so a single buy could
  // dwarf the entire position (151 BTC into a 2.15 BTC holding), and reconstructing each
  // account's running per-symbol balance chronologically went negative in 11 of 47 accounts
  // (e.g. acc-034's GLD implied -4 shares). Swept across all 47 accounts, not the 9-account
  // ACCOUNTS list, for the same reason as the sell-only check above: the violations the reviewer
  // found (acc-004, 010, 031, 032, 034, 038, 039, 040, 045) are outside it.
  it('D33: no transaction implies a negative running balance for its symbol', async () => {
    for (const account of accounts) {
      const txns = transactionsOf(account.id)
      const trades = txns
        .filter((t) => t.type === 'buy' || t.type === 'sell')
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const balances = new Map<string, number>()
      for (const txn of trades) {
        const symbol = txn.symbol!
        const before = balances.get(symbol) ?? 0
        const after = txn.type === 'buy' ? before + txn.quantity! : before - txn.quantity!
        expect(
          after,
          `${account.id} ${txn.id} (${txn.type} ${txn.quantity} ${symbol}) drives the running balance to ${after}`,
        ).toBeGreaterThanOrEqual(0)
        balances.set(symbol, after)
      }
    }
  })

  // Round-2 review, Minor: `Math.max(1, Math.floor(cap * fraction))` is unsound whenever cap < 1
  // — it forces a minimum trade of 1 unit against a cap that holds less than that. It didn't
  // manifest against the fixture (today's smallest non-cash quantity is 2.15 BTC), which is
  // exactly why a synthetic, fixture-independent check is needed: this must hold for any future
  // sub-1-unit position, not just the ones that happen to exist today.
  it('boundedTradeQty never exceeds a sub-1-unit cap', () => {
    const subUnitCaps = [0.05, 0.15, 0.3, 0.5, 0.9, 0.99]
    const rawQtys = [10, 50, 100, 209]
    const fractions = [0.05, 0.2, 0.4]
    for (const cap of subUnitCaps) {
      for (const rawQty of rawQtys) {
        for (const fraction of fractions) {
          const qty = boundedTradeQty(cap, rawQty, fraction, 1)
          expect(qty, `cap=${cap} rawQty=${rawQty} fraction=${fraction}`).toBeLessThanOrEqual(cap)
          expect(qty).toBeGreaterThan(0)
        }
      }
    }
  })

  it('boundedTradeQty returns 0 for a non-positive cap', () => {
    expect(boundedTradeQty(0, 100, 0.2, 1)).toBe(0)
    expect(boundedTradeQty(-1, 100, 0.2, 1)).toBe(0)
  })

  /**
   * The function is exported for reuse and exists to clamp, so it must clamp on every argument
   * rather than only where today's single caller happens to be safe. `NaN <= 0` is false, so an
   * unguarded NaN cap flows past the non-positive check and is returned as a "quantity"; a caller
   * deriving a cap from a running balance can also reach zero from the negative side through float
   * residue. Neither is reachable from the current caller — that is the point of testing it here.
   */
  it('boundedTradeQty clamps out-of-domain input instead of returning it', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(boundedTradeQty(bad, 100, 0.2, 1), `cap ${bad}`).toBe(0)
      expect(boundedTradeQty(0.5, bad, 0.2, 1), `rawQty ${bad}`).toBe(0)
      expect(boundedTradeQty(0.5, 100, bad, 1), `fraction ${bad}`).toBe(0)
    }
    expect(boundedTradeQty(0.5, -5, 0.2, 1)).toBe(0)
    expect(boundedTradeQty(0.5, 10, -0.2, 1)).toBe(0)
    // A fraction above 1 must not let the draw exceed the cap on the whole-share branch either.
    expect(boundedTradeQty(1.5, 100, 2, 1)).toBeLessThanOrEqual(1.5)
  })

  /**
   * Round 4 · the only direction the clamp did NOT close. On the whole-share branch the old
   * `Math.max(1, …)` rounded **up** whenever the draw afforded less than one unit, so a caller
   * asking for 0.2287 of a BTC against a 2.1487 BTC holding was handed a whole BTC — $87,450
   * against a $20,000 notional, breaching both the long-only value bound and the rebalance cash
   * band by up to a full unit. Whether that is right depends entirely on the caller, so
   * `minimumUnits` is now theirs to state: a statement row for a trade that happened names at
   * least one share; a rebalance sleeve that cannot afford one lot trades nothing.
   */
  it('boundedTradeQty rounds a sub-unit draw up or down according to the caller minimum, and never past the cap', () => {
    // The live shape: acc-045's BTC leg, the smallest quantity anywhere in the book.
    expect(boundedTradeQty(2.1487, 0.2287, 1, 1)).toBe(1)
    expect(boundedTradeQty(2.1487, 0.2287, 1, 0)).toBe(0)
    expect(boundedTradeQty(5, 0.3, 1, 1)).toBe(1)
    expect(boundedTradeQty(5, 0.3, 1, 0)).toBe(0)
    // A draw that does afford whole units is unaffected by the policy either way.
    expect(boundedTradeQty(5, 2.9, 1, 0)).toBe(2)
    expect(boundedTradeQty(5, 2.9, 1, 1)).toBe(2)
    // And the minimum never overrides the cap: a sub-1-unit cap still takes the fractional branch.
    expect(boundedTradeQty(0.4, 0.3, 1, 1)).toBeLessThanOrEqual(0.4)
  })
})

describe('wash sale windows', () => {
  it('C10: the window is 61 days — 30 before, the sale date, 30 after', () => {
    const window = washSaleWindow('2026-02-10')
    expect(window.start).toBe('2026-01-11')
    expect(window.end).toBe('2026-03-12')
    expect(window.days).toBe(61)
    const spanDays = (new Date(window.end).getTime() - new Date(window.start).getTime())
      / (1000 * 60 * 60 * 24)
    expect(spanDays + 1).toBe(61)
  })

  it('C10: only loss sales open a window', () => {
    for (const sale of realizedSales) {
      expect(typeof sale.realizedGainLoss).toBe('number')
    }
    const open = openWashSaleWindows('2026-02-25')
    expect(open.length).toBeGreaterThan(0)
    for (const w of open) expect(w.realizedGainLoss).toBeLessThan(0)
  })

  it('C10: a gain sale is excluded by the loss filter, not by coincidence of dates', () => {
    // rs-004 (EFA, +6,260) is a *gain* sale planted to prove the loss filter works. Its 61-day
    // window (2026-01-13 .. 2026-03-14) is still date-live at MOCK_TODAY_ISO — confirmed below —
    // so `realizedGainLoss < 0`, not the `daysRemaining` bound, is what has to keep it out.
    const efaSale = realizedSales.find((s) => s.id === 'rs-004')!
    expect(efaSale.symbol).toBe('EFA')
    expect(efaSale.realizedGainLoss).toBeGreaterThan(0)
    const window = washSaleWindow(efaSale.saleDate)
    const asOfMs = new Date('2026-02-25T00:00:00Z').getTime()
    expect(asOfMs).toBeGreaterThanOrEqual(new Date(`${window.start}T00:00:00Z`).getTime())
    expect(asOfMs).toBeLessThanOrEqual(new Date(`${window.end}T00:00:00Z`).getTime())
    expect(openWashSaleWindows('2026-02-25').some((w) => w.symbol === 'EFA')).toBe(false)
  })

  it('C10: a window that has not opened yet is not reported as open', () => {
    expect(openWashSaleWindows('2026-01-01')).toHaveLength(0)
  })

  it('C10: Margaret Chen sold NVDA at a loss on 2026-02-10; the window closes 2026-03-12', () => {
    const open = openWashSaleWindows('2026-02-25', 'hh-002')
    const nvda = open.find((w) => w.symbol === 'NVDA')!
    expect(nvda.saleDate).toBe('2026-02-10')
    expect(nvda.end).toBe('2026-03-12')
    expect(nvda.daysRemaining).toBe(15)
  })

  it('C10: windows are scoped across every account in the household, including IRAs', () => {
    const open = openWashSaleWindows('2026-02-25', 'hh-001')
    const intc = open.find((w) => w.symbol === 'INTC')!
    expect(intc.accountId).toBe('acc-002')
    // The household's IRAs are in scope for the same symbol — the IRA wash-sale trap.
    expect(realizedSales.filter((s) => s.householdId === 'hh-001').length).toBeGreaterThan(0)
  })

  it('C10: a window that has already closed is not reported as open', () => {
    expect(openWashSaleWindows('2026-06-01')).toHaveLength(0)
  })
})

// `repurchaseBlockedUntil` is a fact about **buying** the symbol back, not about selling the lot:
// selling a long-held INTC lot at a loss is not a wash sale; repurchasing INTC before hh-001's
// rs-001 window closes (2026-03-22) would be. The field carries the date so no surface has to
// guess what is restricted, or until when.
describe('repurchaseBlockedUntil states what is restricted, and until when', () => {
  it('C12: acc-002\'s INTC lots are blocked from repurchase until rs-001\'s window closes', async () => {
    const lots = await getTaxLots('user-001', 'acc-002')
    const positions = await getPositions('user-001', 'acc-002')
    const intcPositionId = positions.find((p) => p.symbol === 'INTC')!.id
    const intcLots = lots.filter((l) => l.positionId === intcPositionId)
    expect(intcLots.length).toBeGreaterThan(0)
    expect(intcLots.every((l) => l.repurchaseBlockedUntil === '2026-03-22')).toBe(true)
  })

  it('C12: a symbol with no open household window is not blocked', async () => {
    const lots = await getTaxLots('user-001', 'acc-002')
    expect(lots.some((l) => l.repurchaseBlockedUntil !== null)).toBe(true)
    expect(lots.some((l) => l.repurchaseBlockedUntil === null)).toBe(true)
  })
})

// C12 · the IRA wash-sale trap — hh-001's only INTC holder is acc-002, the account that sold it,
// so a lot-level check against acc-002 alone can't distinguish household scoping from
// account-only scoping (both restrict the seller identically). These tests go through the
// account-keyed but household-scoped /realized-sales endpoint instead, against a sibling that
// never sold INTC and against an unrelated household, which *does* discriminate between the two.
describe('a household window reaches every account in the household, not just the seller', () => {
  it('C12: a sibling account that never sold INTC still sees hh-001\'s INTC window', async () => {
    // acc-003 is Robert Johnson's Traditional IRA — same household as acc-002 (the seller),
    // no INTC holding or sale of its own.
    const siblingWindows = await getOpenWashSaleWindows('user-001', 'acc-003')
    expect(siblingWindows.some((w) => w.symbol === 'INTC')).toBe(true)
  })

  it('C12: an account in an unrelated household does not see hh-001\'s INTC window', async () => {
    // acc-011 is in hh-003 (Williams) — no relation to hh-001 or the INTC sale.
    const otherHouseholdWindows = await getOpenWashSaleWindows('user-001', 'acc-011')
    expect(otherHouseholdWindows.some((w) => w.symbol === 'INTC')).toBe(false)
  })
})

// C14 · data-integrity follow-up — the tax page (realizedSales) and the transactions page
// (generateTransactions) previously described two different worlds: none of the five realized
// sales was backed by a matching sell transaction. These tests prove the match is exact — by id
// and by the full (symbol, saleDate, quantity, proceeds) tuple — for every one of the five, so a
// dropped or mismatched sale is named in the failure, not just counted.
describe('every realized sale reconciles with a real sell transaction (C14)', () => {
  it.each(realizedSales.map((s) => [s.id, s] as const))(
    '%s: appears in its account\'s transaction stream as a matching sell',
    async (_id, sale) => {
      const txns = transactionsOf(sale.accountId)
      const match = txns.find((t) => t.id === `txn-${sale.id}`)
      expect(match, `${sale.id} missing from ${sale.accountId}'s transactions`).toBeDefined()
      expect(match!.type).toBe('sell')
      expect(match!.symbol).toBe(sale.symbol)
      expect(match!.date.slice(0, 10)).toBe(sale.saleDate)
      expect(match!.quantity).toBe(sale.quantity)
      expect(match!.amount).toBeCloseTo(sale.proceeds, 6)
      expect(match!.price).toBeCloseTo(sale.proceeds / sale.quantity, 6)
    },
  )

  it('C14: acc-007 sold its entire NVDA position — the running balance opens above zero, is drawn down by exactly the sale, and lands on the 0 shares it holds today', async () => {
    const txns = transactionsOf('acc-007')
    const positions = await getPositions('user-001', 'acc-007')
    expect(positions.find((p) => p.symbol === 'NVDA')?.quantity ?? 0).toBe(0)

    const nvda = txns
      .filter((t) => t.symbol === 'NVDA' && (t.type === 'buy' || t.type === 'sell'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    expect(nvda.length).toBeGreaterThanOrEqual(2) // the opening-balance buy + the fixture's sell

    let balance = 0
    for (const t of nvda) {
      balance += t.type === 'buy' ? t.quantity! : -t.quantity!
      expect(balance, `${t.id} drives NVDA's running balance to ${balance}`).toBeGreaterThanOrEqual(0)
    }
    expect(balance).toBe(0)
  })

  it('C14: acc-002 sold part of its INTC position — the running balance lands on the quantity it still holds today', async () => {
    const txns = transactionsOf('acc-002')
    const positions = await getPositions('user-001', 'acc-002')
    const heldToday = positions.find((p) => p.symbol === 'INTC')!.quantity

    const intc = txns
      .filter((t) => t.symbol === 'INTC' && (t.type === 'buy' || t.type === 'sell'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let balance = 0
    for (const t of intc) {
      balance += t.type === 'buy' ? t.quantity! : -t.quantity!
      expect(balance, `${t.id} drives INTC's running balance to ${balance}`).toBeGreaterThanOrEqual(0)
    }
    expect(balance).toBe(heldToday)
  })
})

describe('tax-loss harvesting rates', () => {
  it('C11: short-term losses offset at the ordinary rate + NIIT, long-term at capital-gains + NIIT', () => {
    expect(SHORT_TERM_RATE).toBe(0.408)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(10_000 * taxRateFor('short')).toBeCloseTo(4_080, 2)
    expect(10_000 * taxRateFor('long')).toBeCloseTo(2_380, 2)
  })

  it('C11: a $224,000 long-term loss is a $53,312 benefit, not a $82,880 one', () => {
    expect(224_000 * taxRateFor('long')).toBeCloseTo(53_312, 2)
  })
})

describe('the harvest threshold is currency-aware (PRE-FLIGHT correction 1)', () => {
  it('HARVEST_LOSS_THRESHOLD_USD is -1000', () => {
    expect(HARVEST_LOSS_THRESHOLD_USD).toBe(-1000)
  })

  // Fix-round-1 review, Important #2: `isHarvestable(-1000, 'HKD', ...)` is true for the right
  // reason (converted, -1000/7.82 ≈ -127.9, not below -1000) *and* the wrong one (currency-blind,
  // -1000 < -1000 is also false) — it wasn't among the failures when the reviewer mutated
  // `isHarvestable` back to a raw comparison, so it covered nothing. HK$5,000 is a real loss
  // (converted ≈ -US$639) that a currency-blind comparison would wrongly wave through
  // (-5000 < -1000 is true) but the real, converted comparison correctly excludes — this is
  // strictly inside the gap between the two interpretations, not on the boundary where they
  // coincide.
  it('a HK$5,000 loss (~US$639, genuinely under the US$1,000 threshold) is excluded — a currency-blind comparison would wrongly include it', () => {
    expect(isHarvestable(-5000, 'HKD', FX_RATES_USD_BASE)).toBe(false)
  })

  it('a CHF 1,000 loss (~US$1,120) clears a US$1,000 threshold even though the native-currency figure is close to the raw literal', () => {
    expect(isHarvestable(-1000, 'CHF', FX_RATES_USD_BASE)).toBe(true)
  })

  // acc-044 (CHF Conservative Account) is one of the four non-USD accounts named in the
  // PRE-FLIGHT corrections as where prior defects on this branch landed. lot-pos-234-2 carries a
  // CHF -980 loss: under the old currency-blind literal (`gainLoss < -1000`, comparing a raw CHF
  // number to a bare -1000) it is excluded, because -980 > -1000. Converted to USD at the fixed
  // fixture rate (CHF 0.88 per USD) it is -1,113.64, which *does* clear a real US$1,000
  // threshold — so the currency-blind filter silently hides a genuine harvest opportunity in
  // every non-USD account whose currency is worth more per unit than the dollar.
  it('acc-044: a CHF 980 loss is hidden by the currency-blind literal but is a real harvestable loss once converted', async () => {
    const lots = await getTaxLots('user-001', 'acc-044')
    const lot = lots.find((l) => l.id === 'lot-pos-234-2')!
    expect(lot.gainLoss).toBeCloseTo(-980, 0)

    const currencyBlindSelected = lot.gainLoss < -1000
    expect(currencyBlindSelected, 'this lot should NOT clear the old currency-blind literal').toBe(false)

    expect(isHarvestable(lot.gainLoss, 'CHF', FX_RATES_USD_BASE)).toBe(true)
  })
})

// Fix-round-2 review, Minor M1 — the previous version of this test asserted `RATE_DISCLOSURE`
// contains '37%' and '23.8%'. The reviewer reverted the string to the exact pre-fix hardcoded
// prose (which also happens to say 37% and 23.8%, since that was never in dispute — only whether
// it stays in sync with the constants) and the test passed: a hardcoded string and a templated
// one are byte-identical today, so no test on `RATE_DISCLOSURE`'s *content* alone can tell them
// apart. The only way to prove derivation is to drive the builder with values that appear nowhere
// else in the codebase.
describe('rate disclosure derivation (fix-round-2 review, Minor M1)', () => {
  it('buildRateDisclosure renders whatever rates it is given, not fixed prose', () => {
    const disclosure = buildRateDisclosure(0.4, 0.25, 0.33)
    expect(disclosure).toContain('40% short-term')
    expect(disclosure).toContain('25% long-term')
    expect(disclosure).toContain('33% on collectibles')
    // Neither of the real, current rates should leak in from a hardcoded fallback.
    expect(disclosure).not.toContain('37%')
    expect(disclosure).not.toContain('23.8%')
    expect(disclosure).not.toContain('31.8%')
  })

  it('a different pair of rates produces different, correctly-formatted copy', () => {
    expect(buildRateDisclosure(0.2, 0.15, 0.3)).toContain('20% short-term')
    expect(buildRateDisclosure(0.2, 0.15, 0.3)).toContain('15% long-term')
    expect(buildRateDisclosure(0.2, 0.15, 0.3)).toContain('30% on collectibles')
  })

  it('RATE_DISCLOSURE is buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE, COLLECTIBLE_LONG_TERM_RATE), not a separate literal', () => {
    expect(SHORT_TERM_RATE).toBe(0.408)
    expect(LONG_TERM_RATE).toBe(0.238)
    expect(COLLECTIBLE_LONG_TERM_RATE).toBe(0.318)
    expect(RATE_DISCLOSURE).toBe(buildRateDisclosure(SHORT_TERM_RATE, LONG_TERM_RATE, COLLECTIBLE_LONG_TERM_RATE))
    expect(RATE_DISCLOSURE).toContain('31.8% on collectibles')
    expect(RATE_DISCLOSURE).toContain('40.8% short-term')
    expect(RATE_DISCLOSURE).toContain('3.8% net investment income tax')
    expect(RATE_DISCLOSURE).toContain('23.8% long-term')
    expect(RATE_DISCLOSURE.toLowerCase()).toContain('not tax advice')
  })
})
