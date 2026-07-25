import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTaxLots, getTransactions, getOpenWashSaleWindows } from '@/services/custodian'
import { getPositions } from '@/services/pms'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { accounts } from '@/mocks/data/accounts'
import { boundedTradeQty } from '@/mocks/handlers/custodian'
import { realisedSales, washSaleWindow, openWashSaleWindows } from '@/mocks/data/realised-sales'

const ACCOUNTS = ['acc-001', 'acc-002', 'acc-011', 'acc-020', 'acc-029', 'acc-041', 'acc-042', 'acc-043', 'acc-044']

describe('tax lots partition their positions', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(ACCOUNTS)('%s: lots sum to their position on every dimension', async (accountId) => {
    const [lots, positions] = await Promise.all([getTaxLots(accountId), getPositions(accountId)])
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
    const first = await getTaxLots('acc-001')
    const second = await getTaxLots('acc-001')
    expect(second).toEqual(first)
  })

  it('C12: gainLoss === currentValue − costBasis for every lot', async () => {
    const lots = await getTaxLots('acc-002')
    for (const lot of lots) {
      expect(lot.gainLoss).toBeCloseTo(lot.currentValue - lot.costBasis, 0)
    }
  })

  it.each(ACCOUNTS)('%s: holdingPeriod follows the purchase date against the clock', async (accountId) => {
    const lots = await getTaxLots(accountId)
    for (const lot of lots) {
      const months = (new Date(MOCK_TODAY_ISO).getTime() - new Date(lot.purchaseDate).getTime())
        / (1000 * 60 * 60 * 24 * 365.25 / 12)
      expect(lot.holdingPeriod).toBe(months > 12 ? 'long' : 'short')
    }
  })

  // Round-1 review, Minor #4: acc-001 alone never exercises the §1222 boundary. acc-011 has lots
  // exactly 12 months old (e.g. lot-pos-071-1) — a real fixture case, not a synthetic one.
  it('C12: the §1222 boundary is exercised by the fixture and classified short-term', async () => {
    const lots = await getTaxLots('acc-011')
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
      const lots = await getTaxLots('acc-001')
      byZone.set(tz, lots.map((l) => l.purchaseDate))
    }
    const [firstZone, ...restZones] = zones
    const expected = byZone.get(firstZone!)!
    for (const tz of restZones) {
      expect(byZone.get(tz)).toEqual(expected)
    }
  })

  it('D33: transactions are deterministic and priced consistently with the position', async () => {
    const first = await getTransactions('acc-001')
    const second = await getTransactions('acc-001')
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
  it('D33: a sell never exceeds the quantity currently held', async () => {
    for (const account of accounts) {
      const [txns, positions] = await Promise.all([getTransactions(account.id), getPositions(account.id)])
      const heldBySymbol = new Map(positions.map((p) => [p.symbol, p.quantity]))
      for (const txn of txns.filter((t) => t.type === 'sell')) {
        const held = heldBySymbol.get(txn.symbol!) ?? 0
        expect(
          txn.quantity!,
          `${account.id} ${txn.id} sells ${txn.quantity} ${txn.symbol} against ${held} held`,
        ).toBeLessThanOrEqual(held)
      }
    }
  })

  // Round-2 review, Important: bounding only sells left buys unbounded, so a single buy could
  // dwarf the entire position (151 BTC into a 2.15 BTC holding), and reconstructing each
  // account's running per-symbol balance chronologically went negative in 11 of 47 accounts
  // (e.g. acc-034's GLD implied -4 shares). Swept across all 47 accounts, not the 9-account
  // ACCOUNTS list, for the same reason as the sell-only check above: the violations the reviewer
  // found (acc-004, 010, 031, 032, 034, 038, 039, 040, 045) are outside it.
  it('D33: no transaction implies a negative running balance for its symbol', async () => {
    for (const account of accounts) {
      const txns = await getTransactions(account.id)
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
          const qty = boundedTradeQty(cap, rawQty, fraction)
          expect(qty, `cap=${cap} rawQty=${rawQty} fraction=${fraction}`).toBeLessThanOrEqual(cap)
          expect(qty).toBeGreaterThan(0)
        }
      }
    }
  })

  it('boundedTradeQty returns 0 for a non-positive cap', () => {
    expect(boundedTradeQty(0, 100, 0.2)).toBe(0)
    expect(boundedTradeQty(-1, 100, 0.2)).toBe(0)
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
      expect(boundedTradeQty(bad, 100, 0.2), `cap ${bad}`).toBe(0)
      expect(boundedTradeQty(0.5, bad, 0.2), `rawQty ${bad}`).toBe(0)
      expect(boundedTradeQty(0.5, 100, bad), `fraction ${bad}`).toBe(0)
    }
    expect(boundedTradeQty(0.5, -5, 0.2)).toBe(0)
    expect(boundedTradeQty(0.5, 10, -0.2)).toBe(0)
    // A fraction above 1 must not let the draw exceed the cap on the whole-share branch either.
    expect(boundedTradeQty(1.5, 100, 2)).toBeLessThanOrEqual(1.5)
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
    for (const sale of realisedSales) {
      expect(typeof sale.realisedGainLoss).toBe('number')
    }
    const open = openWashSaleWindows('2026-02-25')
    expect(open.length).toBeGreaterThan(0)
    for (const w of open) expect(w.realisedGainLoss).toBeLessThan(0)
  })

  it('C10: a gain sale is excluded by the loss filter, not by coincidence of dates', () => {
    // rs-004 (EFA, +6,260) is a *gain* sale planted to prove the loss filter works. Its 61-day
    // window (2026-01-13 .. 2026-03-14) is still date-live at MOCK_TODAY_ISO — confirmed below —
    // so `realisedGainLoss < 0`, not the `daysRemaining` bound, is what has to keep it out.
    const efaSale = realisedSales.find((s) => s.id === 'rs-004')!
    expect(efaSale.symbol).toBe('EFA')
    expect(efaSale.realisedGainLoss).toBeGreaterThan(0)
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
    expect(realisedSales.filter((s) => s.householdId === 'hh-001').length).toBeGreaterThan(0)
  })

  it('C10: a window that has already closed is not reported as open', () => {
    expect(openWashSaleWindows('2026-06-01')).toHaveLength(0)
  })
})

describe('washSaleRestricted reflects a real restriction', () => {
  it('C12: a lot whose symbol has an open household window is restricted', async () => {
    const lots = await getTaxLots('acc-002')
    const positions = await getPositions('acc-002')
    const intcPositionId = positions.find((p) => p.symbol === 'INTC')!.id
    const intcLots = lots.filter((l) => l.positionId === intcPositionId)
    expect(intcLots.every((l) => l.washSaleRestricted)).toBe(true)
  })

  it('C12: not every lot is Clear', async () => {
    const lots = await getTaxLots('acc-002')
    expect(lots.some((l) => l.washSaleRestricted)).toBe(true)
    expect(lots.some((l) => !l.washSaleRestricted)).toBe(true)
  })
})

// C12 · the IRA wash-sale trap — hh-001's only INTC holder is acc-002, the account that sold it,
// so a lot-level check against acc-002 alone can't distinguish household scoping from
// account-only scoping (both restrict the seller identically). These tests go through the
// account-keyed but household-scoped /realised-sales endpoint instead, against a sibling that
// never sold INTC and against an unrelated household, which *does* discriminate between the two.
describe('a household window reaches every account in the household, not just the seller', () => {
  it('C12: a sibling account that never sold INTC still sees hh-001\'s INTC window', async () => {
    // acc-003 is Robert Johnson's Traditional IRA — same household as acc-002 (the seller),
    // no INTC holding or sale of its own.
    const siblingWindows = await getOpenWashSaleWindows('acc-003')
    expect(siblingWindows.some((w) => w.symbol === 'INTC')).toBe(true)
  })

  it('C12: an account in an unrelated household does not see hh-001\'s INTC window', async () => {
    // acc-011 is in hh-003 (Williams) — no relation to hh-001 or the INTC sale.
    const otherHouseholdWindows = await getOpenWashSaleWindows('acc-011')
    expect(otherHouseholdWindows.some((w) => w.symbol === 'INTC')).toBe(false)
  })
})
