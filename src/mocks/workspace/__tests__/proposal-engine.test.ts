import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import type { LegEdit, ProposalConstraint } from '@/types/workspace-proposal'
import { applyEdits, buildVersion, editSummary, normaliseConstraints, parseConstraints, parseEdits } from '../proposal-engine'
import { generateRebalanceProposal } from '@/mocks/handlers/oms'

const AGENT: ProposalConstraint[] = [{ kind: 'avoid_self_wash' }]
const built = (constraints: ProposalConstraint[], edits: LegEdit[] = []) => {
  const r = buildVersion('acc-002', constraints, edits)
  if (!r.ok) throw new Error(r.message)
  return r.built
}

describe('buildVersion · acc-002', () => {
  it('v1 is the tax-aware rebalance Phase 0 pinned, with its tax summary from the engine', () => {
    const v = built(AGENT)
    expect(v.preview.trades.map((t) => [t.symbol, t.side, t.quantity])).toEqual([
      ['INTC', 'sell', 7_000], ['SPY', 'sell', 758], ['EFA', 'buy', 3_578], ['VWO', 'buy', 4_441], ['AGG', 'buy', 1_567],
      ['QAI', 'buy', 5_652], ['GLD', 'buy', 369], ['ETHE', 'sell', 3_882], ['IBIT', 'sell', 3_234],
    ])
    expect(v.summary).toEqual({
      sold: 835_915, bought: 926_282, gains: 122_388, losses: -45_850, netShortTerm: 0, netLongTerm: 76_538, washed: 0, grossTax: 29_128, netTax: 10_422,
    })
    expect(v.pretrade.passed).toBe(true)
    expect(v.pretrade.violations.map((x) => [x.category, x.symbol, x.severity])).toEqual([['concentration_limit', 'SPY', 'warning']])
    expect(v.legFacts.find((f) => f.symbol === 'INTC')).toEqual({ symbol: 'INTC', lotIds: ['lot-pos-023-0'], washed: 0 })
    expect(v.excludedLegs).toEqual([])
  })

  it('a version equals a fresh engine run on the same inputs', () => {
    const edits: LegEdit[] = [{ kind: 'exclude', symbol: 'QAI' }, { kind: 'quantity', symbol: 'INTC', quantity: 6_000 }]
    expect(built([{ kind: 'harvest_only' }, ...AGENT], edits)).toEqual(built([...AGENT, { kind: 'harvest_only' }], [...edits].reverse()))
  })

  it('the fingerprint changes with any constraint, edit, quantity or lot, and only then', () => {
    const base = built(AGENT).fingerprint
    expect(built(AGENT).fingerprint).toBe(base)
    const variants = [
      built([...AGENT, { kind: 'harvest_only' }]),
      built(AGENT, [{ kind: 'exclude', symbol: 'QAI' }]),
      built(AGENT, [{ kind: 'quantity', symbol: 'SPY', quantity: 700 }]),
      built(AGENT, [{ kind: 'lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] }]),
    ].map((v) => v.fingerprint)
    expect(new Set([base, ...variants]).size).toBe(5)
    for (const fp of variants) expect(fp).toMatch(/^[0-9A-F]{8}$/)
  })

  it('an excluded leg is listed with the figures the agent proposed, and its class is held back', () => {
    const v = built(AGENT, [{ kind: 'exclude', symbol: 'QAI' }])
    expect(v.preview.trades.some((t) => t.symbol === 'QAI')).toBe(false)
    expect(v.excludedLegs).toEqual([{ symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', side: 'buy', quantity: 5_652, estimatedValue: 198_950 }])
    expect(v.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'alternatives')?.residualReason).toBe('excluded_by_constraint')
  })

  it('specific lots for SPY change its character on the tape', () => {
    const v = built(AGENT, [{ kind: 'lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] }])
    expect(v.summary.netShortTerm).toBeGreaterThan(0)
    expect(v.legFacts.find((f) => f.symbol === 'SPY')?.lotIds).toEqual(['lot-pos-020-1'])
  })

  it('a quantity that drains cash below zero is a pre-trade block, reported, not refused', () => {
    const v = built(AGENT, [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    expect(v.pretrade.violations.some((x) => x.severity === 'block')).toBe(true)
  })
})

describe('edits are re-validated by the engine', () => {
  it.each([
    [[{ kind: 'exclude', symbol: 'MSFT' }], 'NOT_A_LEG'],
    [[{ kind: 'quantity', symbol: 'INTC', quantity: 0 }], 'BAD_QUANTITY'],
    [[{ kind: 'quantity', symbol: 'INTC', quantity: 9_000 }], 'OVER_HELD'],
    [[{ kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-020-0'] }], 'LOT_NOT_IN_POSITION'],
    [[{ kind: 'exclude', symbol: 'QAI' }, { kind: 'exclude', symbol: 'QAI' }], 'DUPLICATE_EDIT'],
  ] as const)('%j → %s', (edits, code) => {
    const r = buildVersion('acc-002', AGENT, edits.map((e) => ({ ...e })) as LegEdit[])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(code)
  })

  it('applyEdits leaves an unedited leg as the same object', () => {
    const base = generateRebalanceProposal('acc-002', true, 0.005, undefined, { avoidSelfWash: true })
    const r = applyEdits('acc-002', base, [{ kind: 'exclude', symbol: 'QAI' }])
    if (!r.ok) throw new Error(r.message)
    expect(r.proposal.legs[0]).toBe(base.legs[0])
  })
})

describe('parsing request bodies', () => {
  it.each([
    [undefined], [{}], [[{ kind: 'nope' }]], [[{ kind: 'cap_realised_gains', usd: -1 }]], [[{ kind: 'cap_realised_gains', usd: 'lots' }]],
    [[{ kind: 'exclude_asset_class', assetClass: 'gold' }]],
  ])('refuses constraints %j', (value) => expect(parseConstraints(value).ok).toBe(false))

  it('accepts and normalises constraints', () => {
    const r = parseConstraints([{ kind: 'exclude_asset_class', assetClass: 'digital_assets' }, { kind: 'harvest_only' }, { kind: 'harvest_only' }])
    if (!r.ok) throw new Error(r.message)
    expect(normaliseConstraints(r.value)).toEqual([{ kind: 'harvest_only' }, { kind: 'exclude_asset_class', assetClass: 'digital_assets' }])
  })

  it.each([
    [undefined], [[{ kind: 'quantity', symbol: 'INTC' }]], [[{ kind: 'quantity', symbol: '', quantity: 1 }]],
    [[{ kind: 'lots', symbol: 'INTC', lotIds: [] }]], [[{ kind: 'lots', symbol: 'INTC', lotIds: [3] }]], [[{ kind: 'rename', symbol: 'INTC' }]],
  ])('refuses edits %j', (value) => expect(parseEdits(value).ok).toBe(false))
})

describe('editSummary', () => {
  const names = new Map([['SPY', 'SPDR S&P 500 ETF'], ['INTC', 'Intel Corp.'], ['QAI', 'IQ Hedge Multi-Strategy Tracker ETF']])
  it('names what changed without a digit', () => {
    const text = editSummary([{ kind: 'quantity', symbol: 'SPY', quantity: 700 }, { kind: 'exclude', symbol: 'QAI' }, { kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-023-0'] }], names)
    expect(text).toBe('Workbench edits: chose specific lots for Intel Corp.; excluded IQ Hedge Multi-Strategy Tracker ETF; set the SPY quantity.')
    expect(text).not.toMatch(/\d/)
  })
  it('says so when the edits are cleared', () => expect(editSummary([], names)).toBe("Back to the agent's legs, with no workbench edits."))
})

describe('every account', () => {
  it.each(accounts.map((a) => a.id))('%s: the agent version builds, and no two legs share a symbol', (id) => {
    const r = buildVersion(id, AGENT, [])
    if (!r.ok) throw new Error(r.message)
    const symbols = r.built.preview.trades.map((t) => t.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})
