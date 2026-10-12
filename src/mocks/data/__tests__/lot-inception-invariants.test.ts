import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLots, capLotAges, monthsSinceInception } from '@/mocks/handlers/custodian'
import { inceptionDate } from '@/lib/security-master'
import { startOfToday, MOCK_TODAY_ISO } from '@/lib/clock'

function lotsWithSymbols(accountId: string) {
  const account = accounts.find((a) => a.id === accountId)!
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const symbolOf = new Map(positions.map((p) => [p.id, p.symbol]))
  return { positions, lots: generateTaxLots(account.id, account.totalValue).map((l) => ({ ...l, symbol: symbolOf.get(l.positionId)! })) }
}

describe('§0.7 · no lot predates its security', () => {
  it('IBIT and BXPE carry their launch dates', () => {
    expect(inceptionDate('IBIT')).toBe('2024-01-11')
    expect(inceptionDate('BXPE')).toBe('2024-01-02')
    expect(inceptionDate('SPY')).toBeUndefined()
  })

  it('every lot in the book is dated on or after its security\'s inception', () => {
    let checked = 0
    for (const account of accounts) {
      for (const lot of lotsWithSymbols(account.id).lots) {
        const inception = inceptionDate(lot.symbol)
        if (inception === undefined) continue
        checked++
        expect(lot.purchaseDate >= inception, `${account.id} ${lot.id} ${lot.symbol} ${lot.purchaseDate}`).toBe(true)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(5)
  })

  it("acc-002's IBIT lots move after launch, stay long-term, and still partition the position at one basis per share", () => {
    const { positions, lots } = lotsWithSymbols('acc-002')
    const ibit = lots.filter((l) => l.symbol === 'IBIT')
    const position = positions.find((p) => p.symbol === 'IBIT')!
    // 2024-02-25 (Sunday) and 2025-01-25 (Saturday) roll back to the Friday before (final review I2).
    expect(ibit.map((l) => l.purchaseDate)).toEqual(['2024-01-25', '2024-02-23', '2025-01-24'])
    expect(ibit.every((l) => l.holdingPeriod === 'long')).toBe(true)
    expect(ibit.reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(position.quantity, 6)
    expect(ibit.reduce((s, l) => s + l.costBasis, 0)).toBe(position.costBasis)
    expect(ibit.reduce((s, l) => s + l.currentValue, 0)).toBeCloseTo(position.marketValue, 6)
    for (const lot of ibit) expect(lot.costBasis / lot.quantity).toBeCloseTo(position.costBasis / position.quantity, 2)
  })

  it("acc-002's BXPE lot is dated after the fund's first close", () => {
    const bxpe = lotsWithSymbols('acc-002').lots.filter((l) => l.symbol === 'BXPE')
    expect(bxpe.map((l) => l.purchaseDate)).toEqual(['2024-01-25'])
  })

  it('names the securities as their sponsors do', () => {
    const names = new Map(getPositionsForAccount('acc-002', 4_500_000).map((p) => [p.symbol, p.name]))
    expect(names.get('ETHE')).toBe('Grayscale Ethereum Trust ETF')
    expect(names.get('BXPE')).toBe('Blackstone Private Equity Strategies Fund')
  })
})

describe('lot-age capping', () => {
  it('counts the whole months back from the anchor that stay on or after inception', () => {
    expect(monthsSinceInception(startOfToday(), '2024-01-11')).toBe(25)
    expect(monthsSinceInception(startOfToday(), '2024-01-25')).toBe(25)
    expect(monthsSinceInception(startOfToday(), '2024-01-26')).toBe(24)
  })
  it('caps the oldest lots and keeps every capped lot a month apart', () => {
    expect(capLotAges([41, 32, 13], 25)).toEqual([25, 24, 13])
    expect(capLotAges([20, 10], 25)).toEqual([20, 10])
  })
  it('never ages a lot below zero, however recent the launch', () => {
    expect(capLotAges([5, 4, 3], 1)).toEqual([1, 0, 0])
  })
  it('no lot in the book is dated after today', () => {
    for (const account of accounts) {
      for (const lot of generateTaxLots(account.id, account.totalValue)) expect(lot.purchaseDate <= MOCK_TODAY_ISO, `${account.id} ${lot.id}`).toBe(true)
    }
  })
})
