import { describe, it, expect } from 'vitest'
import { hasWashSaleRisk, isoDaysBefore, matchWashedShares, type Acquisition } from '@/lib/wash-sale'

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

describe('matchWashedShares (Treas. Reg. §1.1091-1(c): replacement shares wash loss shares one for one)', () => {
  const today = '2026-02-25'
  const buy = (lotId: string, date: string, quantity: number, account: Acquisition['account'] = 'taxable'): Acquisition =>
    ({ symbol: 'SMH', date, lotId, quantity, account })
  const loss = (lotId: string, purchaseDate: string, quantity: number) => ({ lotId, symbol: 'SMH', purchaseDate, quantity })

  it('fewer replacement shares than loss shares wash only that many: 180 bought against 400 sold washes 180', () => {
    const washed = matchWashedShares([loss('old', '2024-06-03', 400)], [buy('new', '2026-02-21', 180)], today)
    expect(washed.get('old')).toEqual({ deferredShares: 180, disallowedShares: 0 })
  })

  it('more replacement shares than loss shares wash every loss share, and no more', () => {
    const washed = matchWashedShares([loss('old', '2024-06-03', 100)], [buy('new', '2026-02-21', 500)], today)
    expect(washed.get('old')).toEqual({ deferredShares: 100, disallowedShares: 0 })
  })

  it('each replacement share washes once: 180 against two loss lots of 150 washes 150 of the earlier and 30 of the later', () => {
    const washed = matchWashedShares(
      [loss('later', '2024-09-01', 150), loss('earlier', '2024-06-03', 150)],
      [buy('new', '2026-02-21', 180)],
      today,
    )
    expect(washed.get('earlier')).toEqual({ deferredShares: 150, disallowedShares: 0 })
    expect(washed.get('later')).toEqual({ deferredShares: 30, disallowedShares: 0 })
  })

  it('a replacement in an IRA or Roth disallows; one in a taxable account defers; the earliest replacement is matched first', () => {
    const washed = matchWashedShares(
      [loss('old', '2024-06-03', 400)],
      [buy('taxable', '2026-02-21', 180), buy('roth', '2026-02-15', 100, 'tax_advantaged')],
      today,
    )
    // Roth 100 (Feb 15) first, then the taxable 180 (Feb 21); 120 shares are left unwashed.
    expect(washed.get('old')).toEqual({ deferredShares: 180, disallowedShares: 100 })
  })

  it('a purchase 31 days back, another symbol, or a lot that is itself sold is not a replacement', () => {
    const washed = matchWashedShares(
      [loss('old', '2024-06-03', 400), loss('recent-loss', '2026-02-20', 50)],
      [
        buy('too-old', '2026-01-25', 100),
        { ...buy('other', '2026-02-20', 100), symbol: 'SOXX' },
        buy('recent-loss', '2026-02-20', 50),
      ],
      today,
    )
    expect(washed.get('old')).toEqual({ deferredShares: 0, disallowedShares: 0 })
    expect(washed.get('recent-loss')).toEqual({ deferredShares: 0, disallowedShares: 0 })
  })

  it('a purchase exactly 30 days back is a replacement', () => {
    expect(isoDaysBefore(today, 30)).toBe('2026-01-26')
    const washed = matchWashedShares([loss('old', '2024-06-03', 10)], [buy('edge', '2026-01-26', 10)], today)
    expect(washed.get('old')).toEqual({ deferredShares: 10, disallowedShares: 0 })
  })
})
