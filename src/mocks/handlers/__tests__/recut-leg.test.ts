import { describe, it, expect } from 'vitest'
import { generateRebalanceTrades, recutLeg, type ProposedTradeLeg } from '@/mocks/handlers/oms'

const legs = generateRebalanceTrades('acc-002', true)
const leg = (symbol: string): ProposedTradeLeg => {
  const found = legs.find((l) => l.symbol === symbol)
  if (!found) throw new Error(`acc-002 proposes no ${symbol} leg`)
  return found
}
const cut = (symbol: string, quantity: number, lotIds?: string[]) => recutLeg('acc-002', leg(symbol), { quantity, lotIds })

describe('recutLeg', () => {
  it('re-cuts a sale to fewer shares and re-realises it lot by lot', () => {
    const r = cut('INTC', 3_000)
    if (!r.ok) throw new Error(r.message)
    expect(r.leg.quantity).toBe(3_000)
    expect(r.leg.estimatedValue).toBe(85_350)           // 3,000 × $28.45
    expect(r.leg.realisedLongTerm).toBe(-19_650)        // 3/7 of the lot's −$45,850
    expect(r.leg.realisedShortTerm).toBe(0)
    expect(r.sale.consumedLotIds).toEqual(['lot-pos-023-0'])
    expect(r.sale.soldLosses).toHaveLength(1)
  })

  it('specific identification moves SPY\'s gain from the long-term lot to the short-term lot and raises its tax', () => {
    const asGenerated = leg('SPY')
    const shortLot = cut('SPY', asGenerated.quantity, ['lot-pos-020-1'])
    if (!shortLot.ok) throw new Error(shortLot.message)
    expect(asGenerated.realisedLongTerm).toBeGreaterThan(0)
    expect(asGenerated.realisedShortTerm).toBe(0)
    expect(shortLot.leg.realisedLongTerm).toBe(0)
    expect(shortLot.leg.realisedShortTerm).toBeGreaterThan(0)
    expect(shortLot.leg.taxImpact).toBeGreaterThan(asGenerated.taxImpact)
    expect(shortLot.sale.consumedLotIds).toEqual(['lot-pos-020-1'])
  })

  it('re-cuts a purchase at the position\'s price', () => {
    const r = cut('EFA', 1_000)
    if (!r.ok) throw new Error(r.message)
    expect(r.leg.estimatedValue).toBe(82_300)           // 1,000 × $82.30
    expect(r.leg.realisedLongTerm).toBe(0)
    expect(r.sale.consumedLotIds).toEqual([])
  })

  it('a re-cut drops the settled wash-sale fields; the batch settles them again', () => {
    const r = recutLeg('acc-002', { ...leg('INTC'), repurchaseBlockedUntil: '2026-03-27' }, { quantity: 7_000 })
    if (!r.ok) throw new Error(r.message)
    expect(r.leg.repurchaseBlockedUntil).toBeUndefined()
    expect(r.leg.washedLoss).toBeUndefined()
  })

  it.each([
    ['INTC', 0, undefined, 'BAD_QUANTITY'],
    ['INTC', -5, undefined, 'BAD_QUANTITY'],
    ['INTC', Number.NaN, undefined, 'BAD_QUANTITY'],
    ['INTC', 1.5, undefined, 'BAD_QUANTITY'],
    ['INTC', 8_000, undefined, 'OVER_HELD'],
    ['INTC', 1_000, ['lot-pos-020-0'], 'LOT_NOT_IN_POSITION'],
    ['SPY', 2_000, ['lot-pos-020-0'], 'LOTS_TOO_SMALL'],
    ['EFA', 100, ['lot-pos-022-0'], 'LOTS_ON_BUY'],
  ] as const)('%s × %s with lots %j is refused with %s', (symbol, quantity, lotIds, code) => {
    const r = cut(symbol, quantity, lotIds ? [...lotIds] : undefined)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe(code)
      expect(r.message.length).toBeGreaterThan(0)
    }
  })
})
