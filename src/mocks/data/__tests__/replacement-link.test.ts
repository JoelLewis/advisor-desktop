import { describe, it, expect } from 'vitest'
import { realizedSales } from '@/mocks/data/realized-sales'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { KNOWN_OPEN_DATES } from '@/mocks/handlers/custodian'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'

describe('a harvest names its replacement (contract shared with the workspace branch)', () => {
  const rs001 = realizedSales.find((s) => s.id === 'rs-001')!

  it('rs-001 was replaced with SMH', () => {
    expect(rs001.replacementSymbol).toBe('SMH')
  })

  it('the replacement is held in the same account, bought on the sale date', () => {
    const account = accounts.find((a) => a.id === rs001.accountId)!
    const smh = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === rs001.replacementSymbol)!
    expect(KNOWN_OPEN_DATES.get(smh.id)).toBe(rs001.saleDate)
  })

  it('a tax-aware rebalance does not sell the replacement inside its hold', () => {
    expect(generateRebalanceTrades(rs001.accountId, true).some((t) => t.symbol === rs001.replacementSymbol)).toBe(false)
  })

  it('every named replacement differs from the security sold', () => {
    for (const sale of realizedSales) if (sale.replacementSymbol !== undefined) expect(sale.replacementSymbol).not.toBe(sale.symbol)
  })
})
