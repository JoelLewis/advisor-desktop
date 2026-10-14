import { describe, expect, it } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { allPositions, seedPositionsForAccount } from '@/mocks/data/positions'
import { MODEL_BANDS, MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { computeDriftForAccount, riskProfileFor } from '@/mocks/handlers/pms'
import { isModelManaged } from '@/lib/mandate'
import { isTradingDay } from '@/lib/trading-calendar'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/**
 * Phase 7a · C1 — the generated book. 30 accounts without explicit rows used to hold one 58/35/5/2 mix
 * whatever their model, so they shared one σ and most sat outside their bands. Each now holds its own
 * model's lineup, tilted per account.
 */
const explicit = new Set(allPositions.map((p) => p.accountId))
const generated = accounts.filter(isModelManaged).filter((a) => !explicit.has(a.id))

/**
 * Model-following accounts outside their band at the seed, each moved there by a story or a transfer.
 * Every other model-following account sits inside its band.
 */
const SEED_OUTSIDE_BAND: ReadonlyMap<string, string> = new Map([
  ['acc-001', 'Johnson Family Trust: the household rebalance the dashboard names'],
  ['acc-002', "Johnson story: Robert's drift is what the Phase 3 proposal and today's release correct"],
  ['acc-006', 'Chen trust: the Ultra-HNW batch rebalance narrative'],
  ['acc-035', "Garcia: equity far above Conservative Income for a 75-year-old (nba-006)"],
  ['acc-046', 'Thompson inherited IRA: cash held back for the required distributions'],
])

/** The accounts whose data says they are in transition; their reason is read from the record, not from here. */
const IN_TRANSITION = accounts.filter(isModelManaged).filter((a) => a.transition !== undefined).map((a) => a.id)

describe('the generated book', () => {
  it('covers the thirty accounts without explicit rows', () => {
    expect(generated).toHaveLength(30)
  })

  it("holds its own model's vehicles, in whole shares, with cash the account's cashBalance and the rows summing to its value", () => {
    for (const account of generated) {
      const model = MODEL_DEFINITIONS.find((m) => m.id === account.modelId)!
      const rows = seedPositionsForAccount(account.id, account.totalValue)
      const vehicles = model.assetClasses.filter((c) => c.assetClass !== 'cash' && c.targetWeight > 0).map((c) => c.implementationSymbol)
      expect(rows.map((r) => r.symbol), account.id).toEqual([...vehicles, 'CASH'])
      for (const r of rows.filter((x) => x.symbol !== 'CASH')) {
        expect(Number.isInteger(r.quantity), `${account.id} ${r.symbol}`).toBe(true)
        expect(r.marketValue, `${account.id} ${r.symbol}`).toBeCloseTo(r.quantity * r.price, 2)
      }
      expect(rows.find((r) => r.symbol === 'CASH')?.marketValue, account.id).toBe(account.cashBalance)
      expect(rows.reduce((s, r) => s + r.marketValue, 0), account.id).toBeCloseTo(account.totalValue, 2)
    }
  })

  it('tilts every account away from its targets, inside its band', () => {
    for (const account of generated) {
      const drift = computeDriftForAccount(account)
      const band = MODEL_BANDS[account.modelId]!.driftTolerance
      expect(drift.needsRebalance, account.id).toBe(false)
      expect(drift.maxAbsDrift, account.id).toBeGreaterThanOrEqual(0.005)
      expect(drift.maxAbsDrift, account.id).toBeLessThan(band)
    }
  })

  it('gives no two generated accounts the same weights', () => {
    const vectors = generated.map((a) => seedPositionsForAccount(a.id, a.totalValue).map((p) => `${p.symbol}:${p.weight.toFixed(6)}`).join('|'))
    expect(new Set(vectors).size).toBe(vectors.length)
  })
})

describe('the book as a whole', () => {
  it('no more than one account in five shares its σ, to four places, with another', () => {
    const vols = accounts.map((a) => riskProfileFor(a).vol.toFixed(4))
    const shared = vols.filter((v) => vols.filter((w) => w === v).length > 1).length
    expect(shared).toBeLessThanOrEqual(accounts.length / 5)
  })

  it('every model-following account sits inside its band at the seed, but for those a story or a transfer moved', () => {
    const outside = accounts.filter(isModelManaged).filter((a) => computeDriftForAccount(a).needsRebalance).map((a) => a.id).sort()
    expect(outside).toEqual([...SEED_OUTSIDE_BAND.keys(), ...IN_TRANSITION].sort())
  })

  it('the Mueller accounts are outside band because their data says they are in transition, not because a test says so', () => {
    expect(IN_TRANSITION).toEqual(['acc-043', 'acc-044'])
    for (const account of accounts.filter(isModelManaged).filter((a) => a.transition)) {
      const { transition } = account
      expect(transition?.kind, account.id).toBe('in_kind_transfer')
      expect(transition?.note.length, account.id).toBeGreaterThan(20)
      expect(computeDriftForAccount(account).needsRebalance, account.id).toBe(true)
    }
  })

  it('a staged transition has no recent full rebalance: every date on it is a trading day, on or after the transfer and not after today', () => {
    for (const account of accounts.filter(isModelManaged).filter((a) => a.transition)) {
      const since = account.transition!.since
      expect(isTradingDay(since), `${account.id} transfer`).toBe(true)
      expect(since <= MOCK_TODAY_ISO, account.id).toBe(true)
      expect(account.lastRebalance, account.id).not.toBeNull()
      expect(isTradingDay(account.lastRebalance!), `${account.id} last step`).toBe(true)
      expect(account.lastRebalance! >= since, account.id).toBe(true)
      expect(account.lastRebalance! <= MOCK_TODAY_ISO, account.id).toBe(true)
    }
  })
})
