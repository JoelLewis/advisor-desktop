import { describe, it, expect } from 'vitest'
import type { ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { bookVersion, recordedSales } from '@/mocks/data/portfolio-ledger'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { eventTime } from '@/lib/clock'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { applyFills, LedgerInvariantError } from '../fills'
import { buildVersion } from '../proposal-engine'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'

const acc002 = accounts.find((a) => a.id === 'acc-002')!
/** The story's v3: harvest only, QAI excluded on the workbench. */
const v3 = () => versionOf(3, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }], [{ kind: 'exclude', symbol: 'QAI' }])
const staged = (v: ProposalVersion, accountId = 'acc-002'): StagedOrder[] => v.preview.trades.map((t, i) => ({
  id: `stg-${String(i + 1).padStart(4, '0')}`, proposalId: 'prop-0001', version: v.n, accountId, symbol: t.symbol, side: t.side,
  quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: eventTime(10), approvalActId: 'REC-0001',
}))
/** In session: the open is sequence 150 (14:30Z). */
const inSession = (n: number) => Array.from({ length: n }, (_, i) => eventTime(150 + i))
const fill = (v: ProposalVersion, accountId = 'acc-002') => {
  const orders = staged(v, accountId)
  return applyFills({ accountId, proposalId: 'prop-0001', version: v, orders, times: inSession(orders.length) })
}
const position = (symbol: string) => getPositionsForAccount('acc-002', acc002.totalValue).find((p) => p.symbol === symbol)
/** v1 of any account, through the same engine as `versionOf`. */
function versionFor(accountId: string): ProposalVersion {
  const r = buildVersion(accountId, AGENT_CONSTRAINTS, [])
  if (!r.ok) throw new Error(r.message)
  return { n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: eventTime(5), constraints: AGENT_CONSTRAINTS, edits: [], changeSummary: 'x', ...r.built }
}

describe('fills for the story\'s v3', () => {
  it('fill at the day\'s prices, sells first, in session', () => {
    const fills = fill(v3())
    expect(fills.map((f) => [f.id, f.symbol, f.side, f.quantity, f.value, f.at])).toEqual([
      ['fill-0001', 'INTC', 'sell', 7000, 199_150, '2026-02-25T14:30:00.000Z'],
      ['fill-0002', 'EFA', 'buy', 1118, 92_011.4, '2026-02-25T14:31:00.000Z'],
      ['fill-0003', 'VWO', 'buy', 1388, 62_182.4, '2026-02-25T14:32:00.000Z'],
      ['fill-0004', 'AGG', 'buy', 490, 48_265, '2026-02-25T14:33:00.000Z'],
      ['fill-0005', 'GLD', 'buy', 115, 24_794, '2026-02-25T14:34:00.000Z'],
    ])
    expect(fills.map((f) => f.price)).toEqual([expect.closeTo(28.45, 8), expect.closeTo(82.3, 8), expect.closeTo(44.8, 8), expect.closeTo(98.5, 8), expect.closeTo(215.6, 8)])
    expect(bookVersion()).toBe(1)
  })

  it('moves the book: INTC gone, two positions opened, cash moved by the fill values, the account value unchanged', () => {
    fill(v3())
    expect(position('INTC')).toBeUndefined()
    expect(position('EFA')).toMatchObject({ quantity: 5276, marketValue: 434_214.8 })
    expect(position('AGG')).toMatchObject({ quantity: 5572, marketValue: 548_842 })
    expect(position('VWO')).toMatchObject({ id: 'pos-acc-002-VWO', assetClass: 'emerging_markets', quantity: 1388, marketValue: 62_182.4, costBasis: 62_182.4, gainLoss: 0 })
    expect(position('GLD')).toMatchObject({ id: 'pos-acc-002-GLD', assetClass: 'commodities', quantity: 115, marketValue: 24_794 })
    expect(position('CASH')?.marketValue).toBeCloseTo(197_401.2, 2)
    const total = getPositionsForAccount('acc-002', acc002.totalValue).reduce((s, p) => s + p.marketValue, 0)
    expect(total).toBeCloseTo(acc002.totalValue, 2)
  })

  it('consumes the INTC lot and opens one lot per buy, dated the fill day, short-term, at cost', () => {
    fill(v3())
    const lots = generateTaxLots('acc-002', acc002.totalValue)
    expect(lots.some((l) => l.id === 'lot-pos-023-0')).toBe(false)
    expect(lots.find((l) => l.id === 'lot-pos-022-fill-0002')).toMatchObject({ positionId: 'pos-022', purchaseDate: '2026-02-25', quantity: 1118, costBasis: 92_011.4, holdingPeriod: 'short' })
    expect(lots.find((l) => l.id === 'lot-pos-acc-002-VWO-fill-0003')).toMatchObject({ positionId: 'pos-acc-002-VWO', quantity: 1388, gainLoss: 0 })
  })

  it('records the INTC sale as realised long-term, opening its recorded window', () => {
    fill(v3())
    expect(recordedSales()).toEqual([{
      id: 'rs-006', accountId: 'acc-002', householdId: 'hh-001', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-25',
      quantity: 7000, proceeds: 199_150, costBasis: 245_000, realisedGainLoss: -45_850, holdingPeriod: 'long',
    }])
  })

  it('names the harvest substitute as the replacement, and carries a washed part', () => {
    const base = v3()
    const named: ProposalVersion = {
      ...base,
      harvestSubstitutions: [{ assetClass: 'us_equity', foreclosed: { symbol: 'INTC', name: 'Intel Corp.' }, bought: { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' }, harvested: true }],
      preview: { ...base.preview, trades: base.preview.trades.map((t) => (t.symbol === 'INTC' ? { ...t, washedLoss: { shortTerm: 0, longTerm: -10_000, deferred: 0, disallowed: -10_000, collectibleLongTerm: 0 } } : t)) },
    }
    fill(named)
    expect(recordedSales()[0]).toMatchObject({ replacementSymbol: 'VTI', washedLoss: -10_000 })
  })
})

describe('partial and fractional sells (v1)', () => {
  it('a partial sale shrinks its lot; a fractional whole-position sale removes the position and every lot', () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    const spyTake = v1.legFacts.find((f) => f.symbol === 'SPY')!.lots[0]!
    const before = generateTaxLots('acc-002', acc002.totalValue).find((l) => l.id === spyTake.lotId)!
    fill(v1)
    const lots = generateTaxLots('acc-002', acc002.totalValue)
    const after = lots.find((l) => l.id === spyTake.lotId)!
    expect(after.quantity).toBeCloseTo(before.quantity - spyTake.shares, 6)
    expect(after.costBasis).toBeCloseTo(before.costBasis * (after.quantity / before.quantity), 1)
    expect(position('SPY')?.quantity).toBe(3879 - 758)
    expect(lots.filter((l) => l.positionId === 'pos-020').reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(3879 - 758, 6)
    expect(position('IBIT')).toBeUndefined()
    expect(lots.some((l) => l.positionId === 'pos-026')).toBe(false)
  })
})

describe('the invariants hold or nothing is committed', () => {
  it('a second application of the same orders sells nothing twice', () => {
    const v = v3()
    fill(v)
    expect(() => fill(v)).toThrow(LedgerInvariantError)
    expect(bookVersion()).toBe(1)
  })

  it('a fill outside the session is refused', () => {
    const v = v3()
    const orders = staged(v)
    expect(() => applyFills({ accountId: 'acc-002', proposalId: 'prop-0001', version: v, orders, times: orders.map((_, i) => eventTime(30 + i)) })).toThrow(LedgerInvariantError)
    expect(bookVersion()).toBe(0)
    expect(position('INTC')?.quantity).toBe(7000)
  })

  it('an account whose sales are not taxed records no realised sale but still consumes its lots', () => {
    const candidate = accounts.filter((a) => !isTaxableAccount(a.taxTreatment))
      .map((account) => ({ account, v: versionFor(account.id) }))
      .find(({ v }) => v.preview.trades.some((t) => t.side === 'sell') && !v.pretrade.violations.some((x) => x.severity === 'block'))
    expect(candidate).toBeDefined()
    const { account, v } = candidate!
    const sell = v.preview.trades.find((t) => t.side === 'sell')!
    const positionId = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === sell.symbol)!.id
    const held = (lots: { positionId: string; quantity: number }[]) => lots.filter((l) => l.positionId === positionId).reduce((s, l) => s + l.quantity, 0)
    const before = held(generateTaxLots(account.id, account.totalValue))
    fill(v, account.id)
    expect(recordedSales()).toEqual([])
    expect(held(generateTaxLots(account.id, account.totalValue))).toBeCloseTo(before - sell.quantity, 6)
  })

  it('a taxable sale whose version names no lots is refused: specific identification never falls back to the book order', () => {
    const base = v3()
    const unnamed: ProposalVersion = { ...base, legFacts: base.legFacts.map((f) => (f.symbol === 'INTC' ? { ...f, lots: [], lotIds: [] } : f)) }
    expect(() => fill(unnamed)).toThrow(LedgerInvariantError)
    expect(() => fill(unnamed)).toThrow(/names no lots for its INTC sale/)
    expect(bookVersion()).toBe(0)
    expect(position('INTC')?.quantity).toBe(7000)
  })

  it('buys that would overdraw cash are refused, and a refused release numbers nothing', () => {
    const base = v3()
    const overdrawn: ProposalVersion = { ...base, preview: { ...base.preview, trades: base.preview.trades.map((t) => (t.symbol === 'AGG' ? { ...t, quantity: 100_000 } : t)) } }
    expect(() => fill(overdrawn)).toThrow(LedgerInvariantError)
    expect(() => fill(overdrawn)).toThrow(/overdraw its cash/)
    expect(bookVersion()).toBe(0)
    expect(position('CASH')?.marketValue).toBeGreaterThan(0)
    const fills = fill(v3())
    expect(fills.map((f) => f.id)).toEqual(['fill-0001', 'fill-0002', 'fill-0003', 'fill-0004', 'fill-0005'])
    expect(recordedSales().map((r) => r.id)).toEqual(['rs-006'])
  })
})
