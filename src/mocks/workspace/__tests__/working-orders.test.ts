import { describe, it, expect } from 'vitest'
import { preTradeCheckProposal } from '@/services/oms'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { workingMovesOf } from '../household-ledger'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'
import { approvedV1 } from './story-fixture'

const leg = (v: ReturnType<typeof versionOf>, symbol: string) => v.preview.trades.find((t) => t.symbol === symbol)

describe('the rebalancer counts working orders', () => {
  it('records the working QQQ buy it counted, valued at its limit', () => {
    expect(versionOf(1, AGENT_CONSTRAINTS).workingOrders).toEqual([
      { orderId: 'ord-005', symbol: 'QQQ', name: 'Invesco QQQ Trust', side: 'buy', quantity: 200, estimatedValue: 96_000, limitPrice: 480 },
    ])
  })

  it("never doubles it: v1 trades no QQQ, and sells more SPY because the order adds to US equity", () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    expect(leg(v1, 'QQQ')).toBeUndefined()
    expect(leg(v1, 'SPY')).toMatchObject({ side: 'sell', quantity: 943 })
    expect(v1.preview.estimatedTaxImpact).toBe(14_454)
  })

  it('measures the drift after with the working order filled: US equity ends inside its band', () => {
    const { projectedDrift } = versionOf(1, AGENT_CONSTRAINTS).preview
    const us = projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')
    if (!us) throw new Error('v1 measures US equity')
    expect(Math.abs(us.drift)).toBeLessThanOrEqual(projectedDrift.driftTolerance)
  })

  it('spends cash net of the working buy: the pre-trade cash is the cash less the order, plus sales, less buys', () => {
    const v3 = versionOf(3, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }], [{ kind: 'exclude', symbol: 'QAI' }])
    const sold = v3.preview.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const bought = v3.preview.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(v3.pretrade.projectedCash).toBeCloseTo(225_504 - 96_000 + sold - bought, 2)
  })

  it('warns when a leg trades a symbol a working order already trades', () => {
    const r = evaluateProposal('acc-002', [{ symbol: 'QQQ', side: 'sell', quantity: 10, estimatedValue: 4_852 }], workingMovesOf('acc-002'))
    expect(r?.violations.find((v) => v.category === 'working_order')).toMatchObject({
      severity: 'warning', symbol: 'QQQ', legs: [0], workingOrder: { orderId: 'ord-005', symbol: 'QQQ', side: 'buy', quantity: 200 },
    })
  })

  it('leaves the trade ticket as it was: the route counts no working order, so a QQQ sale raises no working_order warning', async () => {
    const result = await preTradeCheckProposal('user-001', { accountId: 'acc-002', trades: [{ symbol: 'QQQ', side: 'sell', quantity: 10, estimatedValue: 4_852 }] })
    expect(result.violations.filter((v) => v.category === 'working_order')).toEqual([])
  })

  it("leaves a proposal's own pending orders out: they are its legs", () => {
    const a = approvedV1()
    expect(workingMovesOf('acc-002', a.proposalId).map((w) => w.orderId)).toEqual(['ord-005'])
    expect(workingMovesOf('acc-002').length).toBeGreaterThan(1)
  })
})
