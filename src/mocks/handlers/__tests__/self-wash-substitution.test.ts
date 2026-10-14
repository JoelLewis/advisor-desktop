import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import type { Account } from '@/types/account'

// No recorded sale in the fixtures opens a window on a symbol a rebalance buys, so `avoidSelfWash`
// never has to act on the real book. These tests open one: `windows` lists the extra open loss
// windows, each as sold from a named account, and the engine reads them through the same
// `openWashSaleWindows` every taxpayer-scoped lookup goes through.
const windows = vi.hoisted(() => ({ extra: [] as { accountId: string; householdId: string; symbol: string }[] }))

vi.mock('@/mocks/data/realised-sales', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/data/realised-sales')>()
  const template = original.realisedSales[0]!
  return {
    ...original,
    openWashSaleWindows: (asOf: string, householdId?: string) => [
      ...original.openWashSaleWindows(asOf, householdId),
      ...windows.extra
        .filter((w) => householdId === undefined || w.householdId === householdId)
        .map((w) => ({ ...template, ...w, id: `rs-test-${w.symbol}`, realisedGainLoss: -1_000, start: '2026-02-01', end: '2026-03-31', daysRemaining: 34 })),
    ],
  }
})

type Engine = typeof import('../oms')
type Settle = typeof import('../batch-wash-sales')
let engine: Engine
let settle: Settle['settleBatchWashSales']
let book: readonly Account[]
const TODAY = '2026-02-25'

beforeAll(async () => {
  // The setup file loaded the engine against the real windows; reload it against the mock.
  vi.resetModules()
  engine = await import('../oms')
  settle = (await import('../batch-wash-sales')).settleBatchWashSales
  book = (await import('@/mocks/data/accounts')).accounts
})
afterEach(() => { windows.extra = [] })

const account = (id: string) => book.find((a) => a.id === id)!
const openWindowOn = (accountId: string, symbol: string) => {
  windows.extra = [...windows.extra, { accountId, householdId: account(accountId).householdId, symbol }]
}
const sells = (legs: readonly { side: string }[]) => legs.filter((l) => l.side === 'sell')

describe('a washing buy with a substitute', () => {
  it('acc-006 buys the model\'s VTI for US Equity instead of SPY, and nothing is held back', () => {
    openWindowOn('acc-006', 'SPY')
    const plain = engine.generateRebalanceProposal('acc-006', true)
    const avoided = engine.generateRebalanceProposal('acc-006', true, 0.005, undefined, { avoidSelfWash: true })
    const spy = plain.legs.find((l) => l.symbol === 'SPY' && l.side === 'buy')!
    const vti = avoided.legs.find((l) => l.symbol === 'VTI' && l.side === 'buy')!
    expect(spy).toBeDefined()
    expect(vti.assetClass).toBe('us_equity')
    expect(Math.abs(vti.estimatedValue - spy.estimatedValue)).toBeLessThan(vti.estimatedValue / vti.quantity + 1)
    expect(avoided.legs.some((l) => l.symbol === 'SPY')).toBe(false)
    expect(avoided.heldBack.size).toBe(0)
  })

  it('acc-029 moves its US Equity buy from VTI (held and the model\'s) to the QQQ it holds, and its sales are unchanged', () => {
    // Phase 7a · C1: acc-005 now holds its own model's lineup and sells US equity rather than buying it;
    // the Patel 529 buys VTI and holds QQQ, the same shape.
    openWindowOn('acc-029', 'VTI')
    const plain = engine.generateRebalanceProposal('acc-029', true)
    const avoided = engine.generateRebalanceProposal('acc-029', true, 0.005, undefined, { avoidSelfWash: true })
    expect(avoided.legs.find((l) => l.side === 'buy' && l.assetClass === 'us_equity')?.symbol).toBe('QQQ')
    expect(sells(avoided.legs)).toEqual(sells(plain.legs))
    const [settled] = settle([{ account: account('acc-029'), ...avoided }], TODAY)
    expect(settled!.filter((l) => l.side === 'buy').every((l) => !l.washSaleRisk)).toBe(true)
  })
})

describe('a washing buy with no substitute', () => {
  it('acc-002 drops its EFA buy, keeps the whole INTC harvest and every other leg, and leaves the money in cash', () => {
    openWindowOn('acc-002', 'EFA')
    const plain = engine.generateRebalanceProposal('acc-002', true)
    const avoided = engine.generateRebalanceProposal('acc-002', true, 0.005, undefined, { avoidSelfWash: true })
    expect(plain.legs.some((l) => l.symbol === 'EFA' && l.side === 'buy')).toBe(true)
    expect(avoided.legs.some((l) => l.symbol === 'EFA')).toBe(false)
    expect(avoided.legs).toEqual(plain.legs.filter((l) => l.symbol !== 'EFA'))
    const intc = avoided.legs.find((l) => l.symbol === 'INTC')!
    expect([intc.quantity, intc.estimatedValue]).toEqual([7_000, 199_150])
    expect(avoided.heldBack.get('intl_equity')).toBe('wash_sale_avoided')
  })

  it('acc-002: the residuals read wash_sale_avoided, never cash_capped, with cash left above target', () => {
    openWindowOn('acc-002', 'EFA')
    const avoided = engine.generateRebalanceProposal('acc-002', true, 0.005, undefined, { avoidSelfWash: true })
    const [preview] = engine.buildRebalancePreviews([{ account: account('acc-002'), ...avoided }], true, 0.005, TODAY)
    const drifts = preview!.projectedDrift.assetClassDrifts
    expect(drifts.find((d) => d.assetClass === 'intl_equity')?.residualReason).toBe('wash_sale_avoided')
    expect(drifts.some((d) => d.residualReason === 'cash_capped')).toBe(false)
    const cash = drifts.find((d) => d.assetClass === 'cash')!
    expect(cash.actual).toBeGreaterThan(cash.target)
  })
})

describe('the whole book, a window opened on each account\'s first buy', () => {
  it('no buy washes after settlement, and no sale is scaled for the constraint', () => {
    for (const a of book.filter((x) => x.mandate === 'model')) {
      const firstBuy = engine.generateRebalanceProposal(a.id, true).legs.find((l) => l.side === 'buy')
      if (!firstBuy) continue
      windows.extra = []
      openWindowOn(a.id, firstBuy.symbol)
      const plain = engine.generateRebalanceProposal(a.id, true)
      const avoided = engine.generateRebalanceProposal(a.id, true, 0.005, undefined, { avoidSelfWash: true })
      const [settled] = settle([{ account: a, ...avoided }], TODAY)
      for (const leg of settled!.filter((l) => l.side === 'buy')) expect(leg.washSaleRisk, `${a.id} ${leg.symbol}`).toBe(false)
      expect(sells(avoided.legs), a.id).toEqual(sells(plain.legs))
    }
  })
})
