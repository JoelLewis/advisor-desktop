import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { realisedSales } from '@/mocks/data/realised-sales'
import { generateTaxLots, generateTaxLotsWithSaleRisk, generateTransactions, holdingPeriodOn } from '@/mocks/handlers/custodian'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'

function account(id: string) {
  return accounts.find((a) => a.id === id)!
}

function openingFor(accountId: string, symbol: string) {
  const a = account(accountId)
  return generateTransactions(a.id, a.totalValue).find((t) => t.id === `txn-${accountId}-opening-${symbol}`)!
}

describe('§0.7 · an opening transaction matches the lots it opened', () => {
  it("acc-002's INTC opening is dated the day its remaining lot was bought, 2022-07-25", () => {
    expect(openingFor('acc-002', 'INTC').date.slice(0, 10)).toBe('2022-07-25')
    const a = account('acc-002')
    const intc = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'INTC')!
    const lots = generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === intc.id)
    expect(lots.map((l) => l.purchaseDate)).toEqual(['2022-07-25'])
  })

  it('every recorded sale of a held position opens on the oldest lot date of that position', () => {
    for (const sale of realisedSales) {
      const a = account(sale.accountId)
      const position = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === sale.symbol)
      if (!position) continue
      const oldest = generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === position.id).map((l) => l.purchaseDate).sort()[0]
      expect(openingFor(a.id, sale.symbol).date.slice(0, 10), sale.id).toBe(oldest)
    }
  })

  it("every recorded sale's holding period agrees with its opening transaction", () => {
    for (const sale of realisedSales) {
      const opened = openingFor(sale.accountId, sale.symbol).date.slice(0, 10)
      expect(holdingPeriodOn(opened, sale.saleDate), `${sale.id} opened ${opened}, sold ${sale.saleDate}`).toBe(sale.holdingPeriod)
    }
  })
})

describe('§0.7 · the 2022 INTC lot is not restricted by the 2026-02-20 sale', () => {
  it('selling it is not a wash sale: no INTC was bought in the household in the 30 days before today', () => {
    const a = account('acc-002')
    const intc = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'INTC')!
    const [lot] = generateTaxLotsWithSaleRisk(a.id, a.totalValue).filter((l) => l.positionId === intc.id)
    expect(lot!.purchaseDate).toBe('2022-07-25')
    expect(lot!.saleWash).toEqual({ deferredShares: 0, disallowedShares: 0 })
  })

  it('what the 2026-02-20 sale restricts is buying INTC back, through 2026-03-22', () => {
    const a = account('acc-002')
    const intc = getPositionsForAccount(a.id, a.totalValue).find((p) => p.symbol === 'INTC')!
    const [lot] = generateTaxLots(a.id, a.totalValue).filter((l) => l.positionId === intc.id)
    expect(lot!.repurchaseBlockedUntil).toBe('2026-03-22')
  })

  it('the tax-aware rebalance sells it with no wash-sale flag', () => {
    const leg = generateRebalanceTrades('acc-002', true).find((t) => t.symbol === 'INTC')!
    expect(leg.side).toBe('sell')
    expect(leg.washSaleRisk).toBe(false)
  })
})
