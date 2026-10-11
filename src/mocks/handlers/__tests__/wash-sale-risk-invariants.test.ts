import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { generateRebalanceTrades } from '../oms'
import { generateTaxLots } from '../custodian'
import { hasWashSaleRisk } from '@/lib/wash-sale'
import { MOCK_TODAY_ISO } from '@/lib/clock'

function householdAcquisitions(householdId: string) {
  return accounts.filter((a) => a.householdId === householdId).flatMap((a) => {
    const bySymbol = new Map(getPositionsForAccount(a.id, a.totalValue).map((p) => [p.id, p.symbol]))
    return generateTaxLots(a.id, a.totalValue).map((l) => ({ symbol: bySymbol.get(l.positionId)!, date: l.purchaseDate }))
  })
}

describe('washSaleRisk on every proposed leg equals §1091 recomputed independently', () => {
  it('holds for every account, tax-aware', () => {
    for (const a of accounts) {
      const windows = openWashSaleWindows(MOCK_TODAY_ISO, a.householdId)
      const acquisitions = householdAcquisitions(a.householdId)
      for (const leg of generateRebalanceTrades(a.id, true)) {
        const realisesLoss = leg.realisedShortTerm + leg.realisedLongTerm < 0
        expect(leg.washSaleRisk, `${a.id} ${leg.side} ${leg.symbol}`)
          .toBe(hasWashSaleRisk({ symbol: leg.symbol, side: leg.side, realisesLoss }, windows, acquisitions, MOCK_TODAY_ISO))
      }
    }
  })

  it('acc-002 proposes no INTC buy while the household INTC window is open', () => {
    expect(generateRebalanceTrades('acc-002', true).some((l) => l.symbol === 'INTC' && l.side === 'buy')).toBe(false)
  })
})
