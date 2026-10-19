import { describe, it, expect } from 'vitest'
import { contactWords, holdingOrderWords, ordersCellWords, standingWords } from '@/workspace/household/holding-words'

const AS_OF = '2026-02-25T15:00:00.000Z'

describe('the household page in words', () => {
  it('says an order against the holding it changes', () => {
    expect(holdingOrderWords({ kind: 'working', id: 'ord-005', side: 'buy', symbol: 'QQQ', quantity: 200, quantityUnit: 'sh', limitPrice: 480 }, AS_OF)).toBe('working: buy 200 QQQ, limit 480.00')
    expect(holdingOrderWords({ kind: 'working', id: 'ord-016', side: 'buy', symbol: 'AAPLC185', quantity: 5, quantityUnit: 'contracts', limitPrice: 8.5 }, AS_OF)).toBe('working: buy 5 contracts AAPLC185, limit 8.50')
    expect(holdingOrderWords({ kind: 'pending_compliance', id: 'stg-0002', side: 'sell', symbol: 'SPY', quantity: 943 }, AS_OF)).toBe('pending compliance release: sell 943 SPY')
    expect(holdingOrderWords({ kind: 'filled', id: 'fill-0001', side: 'sell', symbol: 'INTC', quantity: 7_000, at: '2026-02-25T14:30:00.000Z' }, AS_OF)).toBe('filled 09:30 ET: sold 7,000 INTC')
  })
  it("says each member's own tolerance and accounts as a whole", () => {
    expect(standingWords({ clientId: 'cli-002', name: 'Patricia Johnson', tolerance: { band: 'Moderate Conservative', floor: 26, ceiling: 40, score: 35, assessedOn: '2025-09-15' }, whole: { score: 34, status: 'within', value: 2_500_000 } }))
      .toEqual({ tolerance: 'Moderate Conservative tolerance, 26–40 pts', whole: 'accounts as a whole 34 pts' })
    expect(standingWords({ clientId: 'cli-x', name: 'X', tolerance: { band: 'Moderate', floor: 41, ceiling: 55, score: 50, assessedOn: '2025-09-15' } }))
      .toEqual({ tolerance: 'Moderate tolerance, 41–55 pts' })
  })
  it("counts a class's orders", () => {
    expect(ordersCellWords({ openOrders: 2, fillsToday: 0 })).toBe('2 open')
    expect(ordersCellWords({ openOrders: 0, fillsToday: 3 })).toBe('3 filled today')
    expect(ordersCellWords({ openOrders: 1, fillsToday: 1 })).toBe('1 open · 1 filled today')
    expect(ordersCellWords({ openOrders: 0, fillsToday: 0 })).toBe('')
  })
  it('says who last spoke, when and where, with the zone held to its time', () => {
    expect(contactWords({ clientName: 'Robert Johnson', at: '2026-02-25T12:01:00.000Z', direction: 'from_client', where: { kind: 'conversation', threadId: 'th-robert', title: 'Robert Johnson' } }, AS_OF))
      .toBe('Robert Johnson wrote at 07:01 ET, in their conversation')
    expect(contactWords({ clientName: 'Robert Johnson', at: '2026-02-24T17:30:00Z', direction: 'to_client', where: { kind: 'crm', channel: 'email', subject: 'Review agenda' } }, AS_OF))
      .toBe('To Robert Johnson, 24 Feb 12:30 ET, by email: Review agenda')
  })
})
