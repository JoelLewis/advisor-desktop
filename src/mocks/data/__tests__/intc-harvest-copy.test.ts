import { describe, it, expect } from 'vitest'
import { nbas, intcHarvestFacts } from '@/mocks/data/nbas'
import { realisedSales } from '@/mocks/data/realised-sales'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { taxReturnFor, ytdRealisedOnReturn } from '@/mocks/handlers/tax-return'
import { lossAllowedNow } from '@/features/portfolios/tax/shared'
import { formatCalendarDate } from '@/lib/utils'
import { MOCK_TODAY_ISO } from '@/lib/clock'

const dollars = (amount: number) => `$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`

describe('§0.7 · nba-002 refers to the partial harvests already made', () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!

  it("states Robert Johnson's 2026-02-21 harvest and the 7,000 shares he still holds, at the loss a sale today realises", () => {
    const rs001 = realisedSales.find((s) => s.id === 'rs-001')!
    const acc002 = accounts.find((a) => a.id === 'acc-002')!
    const intc = getPositionsForAccount(acc002.id, acc002.totalValue).find((p) => p.symbol === 'INTC')!
    const lossNow = generateTaxLotsWithSaleRisk(acc002.id, acc002.totalValue)
      .filter((l) => l.positionId === intc.id)
      .reduce((s, l) => s + lossAllowedNow(l), 0)
    expect(intc.quantity).toBe(7_000)
    expect(nba.description).toContain(`Robert Johnson harvested ${rs001.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(rs001.saleDate)}`)
    expect(nba.description).toContain(`holds ${intc.quantity.toLocaleString('en-US')} at a ${dollars(lossNow)} loss`)
  })

  it('states every recorded INTC harvest in the accounts it names', () => {
    for (const sale of realisedSales.filter((s) => s.symbol === 'INTC')) {
      expect(nba.description).toContain(`harvested ${sale.quantity.toLocaleString('en-US')} shares on ${formatCalendarDate(sale.saleDate)}`)
    }
  })

  it('the per-account losses it prints add up to the total it states', () => {
    const { holders, totalLoss } = intcHarvestFacts()
    expect(holders.reduce((s, h) => s + h.loss, 0)).toBe(totalLoss)
    for (const h of holders) expect(nba.description).toContain(`at a ${dollars(h.loss)} loss`)
    expect(nba.description).toContain(`${dollars(totalLoss)} of harvestable losses`)
  })

  it("no longer claims a 2026 harvest offsets last year's gains", () => {
    expect(nba.description).not.toContain('Q4')
  })
})

describe("§0.7 · nba-002 states each client's position on their own return", () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!
  const facts = intcHarvestFacts()

  it("states each return's net result so far this year, from the realised-sales ledger", () => {
    for (const { account } of facts.holders) {
      const ytd = ytdRealisedOnReturn(taxReturnFor(account)!, MOCK_TODAY_ISO)
      const net = ytd.shortTerm + ytd.longTerm
      expect(nba.description).toContain(`${dollars(net)} net capital ${net < 0 ? 'loss' : 'gain'} so far this year`)
    }
  })

  it('Robert Johnson and Michael Martinez save no tax this year; their February losses already took the ordinary-income offset', () => {
    // acc-002's joint return: −32,750 LT (rs-001). acc-015's: −24,867 ST (rs-003). Each is past
    // the $3,000 limit already, so the whole harvest carries forward.
    expect(nba.description).toContain('Robert Johnson saves no capital-gains tax this year')
    expect(nba.description).toContain('Michael Martinez saves no capital-gains tax this year')
    expect(nba.description).toContain('$45,850 carries forward')
    expect(nba.description).toContain('$93,250 carries forward')
  })

  it('David Williams saves the tax on his $6,260 gain, offsets $3,000 of ordinary income, and carries the rest forward', () => {
    // +6,260 LT (rs-004) − 52,400 = −46,140: 6,260 × 0.238 = 1,489.88 → $1,490 saved; $3,000 (his
    // household records no filing status, so $1,500 if he files separately) against ordinary income;
    // 52,400 − 6,260 − 3,000 = 43,140 carries forward.
    expect(nba.description).toContain('David Williams saves about $1,490 of capital-gains tax this year')
    expect(nba.description).toContain('offsets $3,000 of ordinary income ($1,500 if filing separately)')
    expect(nba.description).toContain('$43,140 carries forward')
  })

  it('every figure is per return: no sentence pools the offset limit across taxpayers', () => {
    expect(nba.description).not.toMatch(/they offset/)
  })
})

describe('§0.7 · nba-002 trigger and clients are derived from the holders', () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!
  const { holders } = intcHarvestFacts()

  it('the trigger is the aggregate loss over the aggregate cost of the INTC still held', () => {
    // 191,500 / 1,045,000 = 18.33%
    const loss = holders.reduce((s, h) => s + h.position.gainLoss, 0)
    const cost = holders.reduce((s, h) => s + h.position.costBasis, 0)
    expect(nba.trigger.value).toBe(`${((loss / cost) * 100).toFixed(1)}%`)
    expect(nba.trigger.value).toBe('-18.3%')
  })

  it('the clients are the holders', () => {
    expect(nba.clients.map((c) => c.id)).toEqual(holders.map((h) => h.account.clientId))
  })
})
