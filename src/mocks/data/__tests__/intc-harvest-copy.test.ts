import { describe, it, expect } from 'vitest'
import { nbas } from '@/mocks/data/nbas'
import { realisedSales } from '@/mocks/data/realised-sales'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { formatCalendarDate } from '@/lib/utils'
import { ORDINARY_INCOME_OFFSET_LIMIT } from '@/lib/capital-gains'

describe('§0.7 · nba-002 refers to the partial harvests already made', () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!

  it("states Robert Johnson's 2026-02-21 harvest and the 7,000 shares he still holds", () => {
    const rs001 = realisedSales.find((s) => s.id === 'rs-001')!
    const acc002 = accounts.find((a) => a.id === 'acc-002')!
    const intc = getPositionsForAccount(acc002.id, acc002.totalValue).find((p) => p.symbol === 'INTC')!
    expect(intc.quantity).toBe(7_000)
    expect(nba.description).toContain(`Robert Johnson harvested ${rs001.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(rs001.saleDate)}`)
    expect(nba.description).toContain(`holds ${intc.quantity.toLocaleString('en-US')} at a $45,850 loss`)
  })

  it('states every recorded INTC harvest in the accounts it names', () => {
    for (const sale of realisedSales.filter((s) => s.symbol === 'INTC')) {
      expect(nba.description).toContain(`harvested ${sale.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(sale.saleDate)}`)
    }
  })

  it("no longer claims a 2026 harvest offsets last year's gains", () => {
    expect(nba.description).not.toContain('Q4')
  })

  it('states what a 2026 loss can offset: 2026 gains, then up to $3,000 of ordinary income, the rest carried forward', () => {
    expect(nba.description).toContain('2026 capital gains')
    expect(nba.description).toContain(`$${ORDINARY_INCOME_OFFSET_LIMIT.toLocaleString('en-US')} of ordinary income`)
    expect(nba.description).toContain('carries forward')
  })
})
