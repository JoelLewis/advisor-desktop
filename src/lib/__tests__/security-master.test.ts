import { describe, it, expect } from 'vitest'
import { securityKind, concentrationLimitFor, SINGLE_NAME_LIMIT, FUND_LIMIT, CASH_LIMIT } from '@/lib/security-master'

describe('securityKind', () => {
  it.each(['VTI', 'SPY', 'QQQ', 'AGG', 'BND', 'TLT', 'TIP', 'EFA', 'VWO', 'VXUS', 'BNDX', 'LQD', 'VCIT', 'GLD', 'VNQ', 'QAI', 'IBIT', 'ETHE', 'BXPE', 'VFIAX'])(
    '%s is a fund', (symbol) => {
      expect(securityKind(symbol, 'us_equity')).toBe('fund')
    },
  )

  it.each(['NVDA', 'AAPL', 'MSFT', 'INTC'])('%s is a single name', (symbol) => {
    expect(securityKind(symbol, 'us_equity')).toBe('single_name')
  })

  it('CASH is cash regardless of the symbol table', () => {
    expect(securityKind('CASH', 'cash')).toBe('cash')
  })

  it('treats an unknown symbol in a fund-only asset class as a fund', () => {
    expect(securityKind('ZZZZ', 'alternatives')).toBe('fund')
  })

  it('treats an unknown equity symbol as a single name — the conservative default', () => {
    expect(securityKind('ZZZZ', 'us_equity')).toBe('single_name')
  })
})

describe('concentrationLimitFor', () => {
  it('C23: applies 10% to single names, 35% to funds and 15% to cash', () => {
    expect(concentrationLimitFor('single_name')).toBe(SINGLE_NAME_LIMIT)
    expect(concentrationLimitFor('fund')).toBe(FUND_LIMIT)
    expect(concentrationLimitFor('cash')).toBe(CASH_LIMIT)
    expect(SINGLE_NAME_LIMIT).toBe(0.10)
    expect(FUND_LIMIT).toBe(0.35)
    expect(CASH_LIMIT).toBe(0.15)
  })
})
