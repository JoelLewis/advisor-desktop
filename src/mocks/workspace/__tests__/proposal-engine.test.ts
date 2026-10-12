import { describe, it, expect, vi } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { washSaleWindow } from '@/mocks/data/realised-sales'
import type { Acquisition } from '@/lib/wash-sale'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import type { LegEdit, ProposalConstraint } from '@/types/workspace-proposal'
import { applyEdits, buildVersion, editSummary, normaliseConstraints, parseConstraints, parseEdits } from '../proposal-engine'
import { buildRebalancePreviews, generateRebalanceProposal } from '@/mocks/handlers/oms'


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

describe('a version and the engine agree', () => {
  it("the agent version's preview is an independent preview of the generator's own legs", () => {
    const account = accounts.find((a) => a.id === 'acc-002')
    if (!account) throw new Error('acc-002 missing')
    const generated = generateRebalanceProposal('acc-002', true, 0.005, undefined, { avoidSelfWash: true })
    const [fresh] = buildRebalancePreviews([{ account, ...generated }], true, 0.005, MOCK_TODAY_ISO)
    expect(built(AGENT).preview).toEqual(fresh)
  })

  it('the fingerprint does not depend on the key order a constraint or edit was written in', () => {
    const a = built(
      [{ kind: 'exclude_asset_class', assetClass: 'digital_assets' }, { kind: 'cap_realised_gains', usd: 50_000 }],
      [{ kind: 'quantity', symbol: 'SPY', quantity: 700 }, { kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-023-0'] }],
    )
    const b = built(
      [{ assetClass: 'digital_assets', kind: 'exclude_asset_class' } as ProposalConstraint, { usd: 50_000, kind: 'cap_realised_gains' } as ProposalConstraint],
      [{ quantity: 700, symbol: 'SPY', kind: 'quantity' } as LegEdit, { lotIds: ['lot-pos-023-0'], symbol: 'INTC', kind: 'lots' } as LegEdit],
    )
    expect(b.fingerprint).toBe(a.fingerprint)
  })

  it('several gain caps are the tightest of them', () => {
    expect(normaliseConstraints([{ kind: 'cap_realised_gains', usd: 90_000 }, { kind: 'cap_realised_gains', usd: 50_000 }])).toEqual([{ kind: 'cap_realised_gains', usd: 50_000 }])
    expect(built([{ kind: 'cap_realised_gains', usd: 90_000 }, { kind: 'cap_realised_gains', usd: 50_000 }]).fingerprint)
      .toBe(built([{ kind: 'cap_realised_gains', usd: 50_000 }]).fingerprint)
  })

  it('a re-cut loss sale is settled again against a purchase inside its window', async () => {
    // The book holds no purchase inside a proposed loss sale's window, and the test setup has already
    // loaded the engine, so a fresh copy is loaded with one planted in the taxpayer's acquisitions.
    const planted: Acquisition[] = [{ symbol: 'INTC', date: '2026-02-15', lotId: 'planted-intc', quantity: 2_000, account: 'taxable' }]
    vi.resetModules()
    vi.doMock('@/mocks/handlers/custodian', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/mocks/handlers/custodian')>()
      return { ...actual, washSaleAcquisitions: (...args: Parameters<typeof actual.washSaleAcquisitions>) => [...actual.washSaleAcquisitions(...args), ...planted] }
    })
    try {
      const engine = await import('../proposal-engine')
      const version = (edits: LegEdit[]) => {
        const r = engine.buildVersion('acc-002', AGENT, edits)
        if (!r.ok) throw new Error(r.message)
        const sale = r.built.preview.trades.find((t) => t.symbol === 'INTC')
        if (!sale) throw new Error('no INTC sale')
        const washed = (sale.washedLoss?.shortTerm ?? 0) + (sale.washedLoss?.longTerm ?? 0)
        return { sale, washed, built: r.built }
      }

      // Two thousand of six thousand loss shares wash; the rest keep the repurchase window open.
      const part = version([{ kind: 'quantity', symbol: 'INTC', quantity: 6_000 }])
      expect(part.sale.realisedLongTerm).toBe(-39_300)
      expect(part.washed).toBe(-13_100)
      expect(part.built.legFacts.find((f) => f.symbol === 'INTC')?.washed).toBe(part.washed)
      expect(part.built.summary.washed).toBe(part.washed)
      expect(part.sale.repurchaseBlockedUntil).toBe(washSaleWindow(MOCK_TODAY_ISO).end)

      // Cut to fewer shares than were bought, the whole loss washes and no window is left open.
      const whole = version([{ kind: 'quantity', symbol: 'INTC', quantity: 1_500 }])
      expect(whole.washed).toBe(whole.sale.realisedLongTerm)
      expect(whole.washed).toBeLessThan(0)
      expect(whole.built.legFacts.find((f) => f.symbol === 'INTC')?.washed).toBe(whole.washed)
      expect(whole.built.summary.washed).toBe(whole.washed)
      expect(whole.sale.repurchaseBlockedUntil).toBeUndefined()

      // Without the purchase the same edit washes nothing.
      planted.length = 0
      const none = version([{ kind: 'quantity', symbol: 'INTC', quantity: 6_000 }])
      expect(none.sale.washedLoss).toBeUndefined()
      expect(none.built.legFacts.find((f) => f.symbol === 'INTC')?.washed).toBe(0)
      expect(none.built.summary.washed).toBe(0)
      expect(none.sale.repurchaseBlockedUntil).toBe(washSaleWindow(MOCK_TODAY_ISO).end)
    } finally {
      vi.doUnmock('@/mocks/handlers/custodian')
      vi.resetModules()
    }
  })
})

describe('edits are re-validated by the engine', () => {
  it.each([
    [[{ kind: 'exclude', symbol: 'MSFT' }], 'NOT_A_LEG'],
    [[{ kind: 'quantity', symbol: 'INTC', quantity: 0 }], 'BAD_QUANTITY'],
    [[{ kind: 'quantity', symbol: 'INTC', quantity: 9_000 }], 'OVER_HELD'],
    [[{ kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-020-0'] }], 'LOT_NOT_IN_POSITION'],
    [[{ kind: 'exclude', symbol: 'QAI' }, { kind: 'exclude', symbol: 'QAI' }], 'DUPLICATE_EDIT'],
    [[{ kind: 'exclude', symbol: 'QAI' }, { kind: 'quantity', symbol: 'QAI', quantity: 100 }], 'CONFLICTING_EDITS'],
    [[{ kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-023-0'] }, { kind: 'exclude', symbol: 'INTC' }], 'CONFLICTING_EDITS'],
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
