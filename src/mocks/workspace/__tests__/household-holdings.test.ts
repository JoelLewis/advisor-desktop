import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { accountValueUSD } from '@/lib/aum'
import { householdView } from '../household-views'
import { approvedStoryV3, release } from './story-fixture'

const ADRIAN = 'user-001'
const view = (id: string) => {
  const v = householdView(ADRIAN, id)
  if (!v) throw new Error(`Adrian reads ${id}`)
  return v
}
const row = (id: string, assetClass: string) => {
  const r = view(id).holdings.rows.find((x) => x.assetClass === assetClass)
  if (!r) throw new Error(`${id} has no ${assetClass} row`)
  return r
}
const managedHolder = (id: string, assetClass: string, accountId: string) => {
  const h = row(id, assetClass).holders.find((x) => x.kind === 'managed' && x.accountId === accountId)
  if (!h || h.kind !== 'managed') throw new Error(`${accountId} holds no ${assetClass}`)
  return h
}
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0)

describe('holdings by asset class against the household target', () => {
  it('ties: the classes sum to the managed value, the targets to one, and each class to the accounts holding it', () => {
    const { holdings } = view('hh-001')
    expect(sum(holdings.rows.map((r) => r.value))).toBeCloseTo(holdings.modelValue, 0)
    expect(holdings.modelValue).toBeCloseTo(holdings.managedValue, 0)
    expect(sum(holdings.rows.map((r) => r.target))).toBeCloseTo(1, 9)
    for (const r of holdings.rows) {
      expect(sum(r.holders.flatMap((h) => (h.kind === 'managed' ? [h.value] : []))), r.assetClass).toBeCloseTo(r.value, 2)
      expect(r.drift, r.assetClass).toBeCloseTo(r.weight - r.target, 12)
      expect(r.withinBand, r.assetClass).toBe(Math.abs(r.drift) <= r.band)
    }
  })

  it("weights the target by each model account's value", () => {
    const own = accounts.filter((a) => a.householdId === 'hh-001')
    const { holdings } = view('hh-001')
    expect(holdings.modelValue).toBeCloseTo(sum(own.map((a) => accountValueUSD(a, FX_RATES_USD_BASE))), 0)
  })

  it('marks held-away plans as outside the firm\'s view and keeps them out of the totals', () => {
    const us = row('hh-001', 'us_equity')
    const away = us.holders.filter((h) => h.kind === 'held_away')
    expect(away.map((h) => h.kind === 'held_away' && h.heldAwayId)).toEqual(['ha-001', 'ha-002'])
    expect(away.map((h) => h.value)).toEqual([2_400_000 * 0.55, 1_500_000 * 0.40])
  })

  it('puts the working QQQ buy on the US equity it changes, in Robert Johnson · Individual (…3847)', () => {
    const h = managedHolder('hh-001', 'us_equity', 'acc-002')
    expect(h.name).toBe('Robert Johnson · Individual (…3847)')
    expect(h.orders).toContainEqual({ kind: 'working', id: 'ord-005', side: 'buy', symbol: 'QQQ', quantity: 200, quantityUnit: 'sh', limitPrice: 480 })
    expect(row('hh-001', 'us_equity').openOrders).toBe(2)
  })

  it("then the approved version's orders, pending compliance release, and after the release today's fills", () => {
    const approved = approvedStoryV3()
    expect(managedHolder('hh-001', 'us_equity', 'acc-002').orders).toContainEqual(expect.objectContaining({ kind: 'pending_compliance', side: 'sell', symbol: 'INTC', quantity: 7_000 }))
    release(approved)
    const filled = managedHolder('hh-001', 'us_equity', 'acc-002').orders.find((o) => o.kind === 'filled' && o.symbol === 'INTC')
    expect(filled).toMatchObject({ kind: 'filled', side: 'sell', quantity: 7_000 })
    expect(row('hh-001', 'fixed_income').fillsToday).toBeGreaterThan(0)
  })

  it("Chen-Wong's classes tie to its value in USD", () => {
    const { holdings } = view('hh-002')
    expect(sum(holdings.rows.map((r) => r.value))).toBeCloseTo(holdings.modelValue, 0)
    const own = accounts.filter((a) => a.householdId === 'hh-002' && a.mandate === 'model')
    expect(holdings.modelValue).toBeCloseTo(sum(own.map((a) => accountValueUSD(a, FX_RATES_USD_BASE))), -1)
  })

  it("Chen-Wong's managed value, on the page and in its header, is the sum of its accounts in USD", () => {
    const all = sum(accounts.filter((a) => a.householdId === 'hh-002').map((a) => accountValueUSD(a, FX_RATES_USD_BASE)))
    const v = view('hh-002')
    expect(Math.abs(v.holdings.managedValue - all)).toBeLessThanOrEqual(5)
    expect(v.managedValue).toBe(v.holdings.managedValue)
  })

  it("Chen-Wong's accounts, in USD, sum to its managed value, and each names its currency", () => {
    const v = view('hh-002')
    expect(Math.abs(sum(v.accounts.map((a) => a.valueUsd)) - v.managedValue)).toBeLessThanOrEqual(5)
    expect(v.accounts.some((a) => a.currency !== 'USD')).toBe(true)
    for (const a of v.accounts) expect(a.currency === 'USD' ? a.valueUsd === a.value : a.valueUsd !== a.value, a.accountId).toBe(true)
  })

  it('has a row for every class named by a target, a position, a held-away plan, an open order or a fill', () => {
    release(approvedStoryV3())
    for (const id of ['hh-001', 'hh-002', 'hh-007']) {
      const { holdings } = view(id)
      const named = new Set(holdings.rows.map((r) => r.assetClass))
      for (const r of holdings.rows) for (const h of r.holders) if (h.kind === 'managed') for (const o of h.orders) expect(named.has(r.assetClass), `${id} ${o.id}`).toBe(true)
    }
    expect(view('hh-001').holdings.rows.map((r) => r.assetClass)).toEqual(expect.arrayContaining(['us_equity', 'fixed_income']))
  })

  it("lists a custom mandate's orders and fills with that account, outside the class rows", () => {
    for (const a of view('hh-007').holdings.notInTarget) expect(Array.isArray(a.orders), a.accountId).toBe(true)
    const classOrders = view('hh-007').holdings.rows.flatMap((r) => r.holders.flatMap((h) => (h.kind === 'managed' ? h.orders : [])))
    const custom = new Set(view('hh-007').holdings.notInTarget.flatMap((a) => a.orders.map((o) => o.id)))
    expect(classOrders.filter((o) => custom.has(o.id))).toEqual([])
  })

  it("Patel's custom mandate is outside the target, listed by name", () => {
    const { holdings } = view('hh-007')
    expect(holdings.notInTarget.map((a) => a.name)).toContain('Patel Digital Assets Account (…0912)')
    expect(holdings.managedValue).toBeGreaterThan(holdings.modelValue)
  })
})
