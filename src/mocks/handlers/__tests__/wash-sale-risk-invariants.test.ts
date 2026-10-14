import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindowsFor, sameWashSaleTaxpayer } from '../tax-return'
import { generateRebalanceTrades } from '../oms'
import { generateTaxLots } from '../custodian'
import { hasWashSaleRisk } from '@/lib/wash-sale'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import type { Account } from '@/types/account'
import { isModelManaged } from '@/lib/mandate'

/** Who counts is `sameWashSaleTaxpayer`'s rule, tested in tax-return-netting.test.ts; the rest is recomputed here. */
function taxpayerAcquisitions(account: Account) {
  return sameWashSaleTaxpayer(account).flatMap((a) => {
    const bySymbol = new Map(getPositionsForAccount(a.id, a.totalValue).map((p) => [p.id, p.symbol]))
    return generateTaxLots(a.id, a.totalValue).map((l) => {
      const symbol = bySymbol.get(l.positionId)
      if (symbol === undefined) throw new Error(`tax lot ${l.id} in ${a.id} names unknown position ${l.positionId}`)
      return { symbol, date: l.purchaseDate, lotId: l.id }
    })
  })
}

function lotIdsOfSymbol(accountId: string, totalValue: number, symbol: string): string[] {
  const ids = new Set(getPositionsForAccount(accountId, totalValue).filter((p) => p.symbol === symbol).map((p) => p.id))
  return generateTaxLots(accountId, totalValue).filter((l) => ids.has(l.positionId)).map((l) => l.id)
}

describe('washSaleRisk on every proposed leg equals §1091 recomputed independently', () => {
  it('holds for every account, tax-aware', () => {
    for (const a of accounts.filter(isModelManaged)) {
      const windows = openWashSaleWindowsFor(a, MOCK_TODAY_ISO)
      const acquisitions = taxpayerAcquisitions(a)
      for (const leg of generateRebalanceTrades(a.id, true)) {
        const realisesLoss = leg.realisedShortTerm + leg.realisedLongTerm < 0
        // The legs do not expose which lots they consume, so the recompute treats every lot of the
        // sold symbol in this account as sold: the conservative reading, identical to the engine
        // whenever a sale exhausts the position's recent lots.
        const soldLotIds = leg.side === 'sell' ? lotIdsOfSymbol(a.id, a.totalValue, leg.symbol) : []
        expect(leg.washSaleRisk, `${a.id} ${leg.side} ${leg.symbol}`)
          .toBe(hasWashSaleRisk({ symbol: leg.symbol, side: leg.side, realisesLoss, soldLotIds }, windows, acquisitions, MOCK_TODAY_ISO))
      }
    }
  })

  it('acc-002 does not propose an INTC buy (INTC is overweight there; the engine does not suppress window buys)', () => {
    expect(generateRebalanceTrades('acc-002', true).some((l) => l.symbol === 'INTC' && l.side === 'buy')).toBe(false)
  })
})
