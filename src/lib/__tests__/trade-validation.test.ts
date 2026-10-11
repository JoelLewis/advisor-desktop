import { describe, it, expect } from 'vitest'
import { validateTrade, type TradeFieldValues } from '@/lib/trade-validation'

const base = { accountId: 'acc-001', symbol: 'AAPL', side: 'buy', quantity: 10, orderType: 'market' }
const trade = (over: Partial<TradeFieldValues>): TradeFieldValues => ({ assetClass: 'equity', ...base, ...over })

describe('validateTrade: common fields', () => {
  it('accepts a complete market equity order', () => {
    expect(validateTrade(trade({}))).toBe(true)
  })

  it.each(['accountId', 'symbol', 'side'] as const)('rejects a missing %s', (field) => {
    expect(validateTrade(trade({ [field]: '' }))).toBe(false)
  })
})

describe('validateTrade: equity', () => {
  it('rejects zero quantity', () => {
    expect(validateTrade(trade({ quantity: 0 }))).toBe(false)
  })
  it('limit orders need a positive limit price', () => {
    expect(validateTrade(trade({ orderType: 'limit', limitPrice: 100 }))).toBe(true)
    expect(validateTrade(trade({ orderType: 'limit' }))).toBe(false)
    expect(validateTrade(trade({ orderType: 'limit', limitPrice: -1 }))).toBe(false)
  })
  it('stop orders need a positive stop price', () => {
    expect(validateTrade(trade({ orderType: 'stop', stopPrice: 90 }))).toBe(true)
    expect(validateTrade(trade({ orderType: 'stop' }))).toBe(false)
  })
  it('stop-limit orders need both prices', () => {
    expect(validateTrade(trade({ orderType: 'stop_limit', limitPrice: 100, stopPrice: 90 }))).toBe(true)
    expect(validateTrade(trade({ orderType: 'stop_limit', limitPrice: 100 }))).toBe(false)
    expect(validateTrade(trade({ orderType: 'stop_limit', stopPrice: 90 }))).toBe(false)
  })
})

describe('validateTrade: option', () => {
  const option = { assetClass: 'option' as const, optionType: 'call' as const, strikePrice: 150, expirationDate: '2027-01-15' }
  it('accepts a complete option order', () => {
    expect(validateTrade(trade(option))).toBe(true)
  })
  it('rejects zero quantity', () => {
    expect(validateTrade(trade({ ...option, quantity: 0 }))).toBe(false)
  })
  it.each(['optionType', 'strikePrice', 'expirationDate'] as const)('rejects a missing %s', (field) => {
    expect(validateTrade(trade({ ...option, [field]: undefined }))).toBe(false)
  })
  it('limit orders need a positive limit price', () => {
    expect(validateTrade(trade({ ...option, orderType: 'limit', limitPrice: 2 }))).toBe(true)
    expect(validateTrade(trade({ ...option, orderType: 'limit' }))).toBe(false)
  })
})

describe('validateTrade: mutual fund', () => {
  const fund = { assetClass: 'mutual_fund' as const }
  it('dollar purchases need a positive dollar amount', () => {
    expect(validateTrade(trade({ ...fund, amountType: 'dollars', dollarAmount: 5_000, quantity: 0 }))).toBe(true)
    expect(validateTrade(trade({ ...fund, amountType: 'dollars', quantity: 0 }))).toBe(false)
    expect(validateTrade(trade({ ...fund, amountType: 'dollars', dollarAmount: 0 }))).toBe(false)
  })
  it('share purchases need a positive quantity', () => {
    expect(validateTrade(trade({ ...fund, amountType: 'shares', quantity: 5 }))).toBe(true)
    expect(validateTrade(trade({ ...fund, amountType: 'shares', quantity: 0 }))).toBe(false)
  })
  it('exchanges need a target symbol', () => {
    expect(validateTrade(trade({ ...fund, side: 'exchange', exchangeTargetSymbol: 'VTSAX' }))).toBe(true)
    expect(validateTrade(trade({ ...fund, side: 'exchange' }))).toBe(false)
  })
})

describe('validateTrade: fixed income', () => {
  const bond = { assetClass: 'fixed_income' as const, parAmount: 50_000, bondPriceType: 'price' }
  it('accepts a complete bond order', () => {
    expect(validateTrade(trade(bond))).toBe(true)
  })
  it('needs a positive par amount', () => {
    expect(validateTrade(trade({ ...bond, parAmount: 0 }))).toBe(false)
    expect(validateTrade(trade({ ...bond, parAmount: undefined }))).toBe(false)
  })
  it('needs a price type', () => {
    expect(validateTrade(trade({ ...bond, bondPriceType: undefined }))).toBe(false)
  })
  it('limit orders need a positive price or yield', () => {
    expect(validateTrade(trade({ ...bond, orderType: 'limit', priceOrYield: 99.5 }))).toBe(true)
    expect(validateTrade(trade({ ...bond, orderType: 'limit' }))).toBe(false)
  })
})

describe('validateTrade: digital asset', () => {
  const crypto = { assetClass: 'digital_asset' as const }
  it('accepts a market order with positive quantity', () => {
    expect(validateTrade(trade({ ...crypto, quantity: 0.25 }))).toBe(true)
  })
  it('rejects zero quantity', () => {
    expect(validateTrade(trade({ ...crypto, quantity: 0 }))).toBe(false)
  })
  it('limit orders need a positive limit price', () => {
    expect(validateTrade(trade({ ...crypto, orderType: 'limit', limitPrice: 60_000 }))).toBe(true)
    expect(validateTrade(trade({ ...crypto, orderType: 'limit' }))).toBe(false)
  })
})

describe('validateTrade: unknown asset class', () => {
  it('rejects it', () => {
    expect(validateTrade({ ...trade({}), assetClass: 'warrant' as TradeFieldValues['assetClass'] })).toBe(false)
  })
})
