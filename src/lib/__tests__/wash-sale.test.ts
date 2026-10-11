import { describe, it, expect } from 'vitest'
import { hasWashSaleRisk, isoDaysBefore } from '@/lib/wash-sale'

const window = { symbol: 'INTC', start: '2026-01-22', end: '2026-03-23' }

describe('hasWashSaleRisk (IRC §1091, same-symbol approximation)', () => {
  it('a buy inside an open loss-sale window for the same symbol is at risk', () => {
    expect(hasWashSaleRisk({ symbol: 'INTC', side: 'buy', realisesLoss: false, soldLotIds: [] }, [window], [], '2026-02-25')).toBe(true)
  })
  it('a buy of a different symbol is not', () => {
    expect(hasWashSaleRisk({ symbol: 'SMH', side: 'buy', realisesLoss: false, soldLotIds: [] }, [window], [], '2026-02-25')).toBe(false)
  })
  it('a buy after the window closed is not', () => {
    expect(hasWashSaleRisk({ symbol: 'INTC', side: 'buy', realisesLoss: false, soldLotIds: [] }, [window], [], '2026-03-24')).toBe(false)
  })
  it('a loss sale with the same symbol acquired in the prior 30 days is at risk', () => {
    expect(hasWashSaleRisk({ symbol: 'TLT', side: 'sell', realisesLoss: true, soldLotIds: [] }, [], [{ symbol: 'TLT', date: '2026-02-01', lotId: 'l1' }], '2026-02-25')).toBe(true)
  })
  it('a loss sale whose last acquisition is 31 days back is not', () => {
    expect(hasWashSaleRisk({ symbol: 'TLT', side: 'sell', realisesLoss: true, soldLotIds: [] }, [], [{ symbol: 'TLT', date: '2026-01-25', lotId: 'l1' }], '2026-02-25')).toBe(false)
  })
  it('a gain sale is never at risk', () => {
    expect(hasWashSaleRisk({ symbol: 'TLT', side: 'sell', realisesLoss: false, soldLotIds: [] }, [], [{ symbol: 'TLT', date: '2026-02-20', lotId: 'l1' }], '2026-02-25')).toBe(false)
  })
  it('a loss sale whose only recent acquisition is the lot being sold is not at risk', () => {
    const leg = { symbol: 'TLT', side: 'sell' as const, realisesLoss: true, soldLotIds: ['l1'] }
    expect(hasWashSaleRisk(leg, [], [{ symbol: 'TLT', date: '2026-02-20', lotId: 'l1' }], '2026-02-25')).toBe(false)
  })
  it('a loss sale is at risk when another lot (e.g. another household account) bought the symbol in the window', () => {
    const leg = { symbol: 'TLT', side: 'sell' as const, realisesLoss: true, soldLotIds: ['l1'] }
    const acquisitions = [{ symbol: 'TLT', date: '2026-02-20', lotId: 'l1' }, { symbol: 'TLT', date: '2026-02-10', lotId: 'other-acct-lot' }]
    expect(hasWashSaleRisk(leg, [], acquisitions, '2026-02-25')).toBe(true)
  })
  it('isoDaysBefore crosses month boundaries in UTC', () => {
    expect(isoDaysBefore('2026-03-01', 30)).toBe('2026-01-30')
  })
})
