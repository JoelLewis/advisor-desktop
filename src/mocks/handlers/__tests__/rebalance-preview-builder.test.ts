import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { buildRebalancePreviews, generateRebalanceProposal, recutLeg, type ProposedTradeLeg } from '@/mocks/handlers/oms'
import type { LegSale } from '@/mocks/handlers/batch-wash-sales'
import { LONG_TERM_RATE } from '@/lib/tax-rules'
import { MOCK_TODAY_ISO } from '@/lib/clock'

describe('buildRebalancePreviews', () => {
  it('serves exactly what the rebalance endpoint serves, batch netting included', async () => {
    const ids = ['acc-001', 'acc-002', 'acc-003', 'acc-005']
    const served = await previewRebalance({ accountIds: ids, taxAware: true })
    const built = buildRebalancePreviews(
      ids.map((id) => ({ account: accounts.find((a) => a.id === id)!, ...generateRebalanceProposal(id, true) })),
      true, undefined, MOCK_TODAY_ISO,
    )
    expect(JSON.parse(JSON.stringify(built))).toEqual(served)
  })

  it('acc-002 alone: the INTC loss nets against the joint return, and the estimate is the one Phase 0 pinned', () => {
    const account = accounts.find((a) => a.id === 'acc-002')!
    const [preview] = buildRebalancePreviews([{ account, ...generateRebalanceProposal('acc-002', true) }], true, 0.005, MOCK_TODAY_ISO)
    expect(preview!.estimatedTaxImpact).toBe(10_422)
    expect(preview!.grossTaxOnGains).toBe(29_128)
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: -32_750, collectibleLongTerm: 0 })
    expect(preview!.trades.find((t) => t.symbol === 'INTC')?.repurchaseBlockedUntil).toBe('2026-03-27')
  })

  it('a re-cut INTC sale spliced into the proposal is settled again and moves the estimate by the loss it no longer realises', () => {
    const account = accounts.find((a) => a.id === 'acc-002')!
    const proposal = generateRebalanceProposal('acc-002', true)
    const intc = proposal.legs.find((l) => l.symbol === 'INTC')!
    const recut = recutLeg('acc-002', intc, { quantity: 3_000 })
    if (!recut.ok) throw new Error(recut.message)
    const legs = proposal.legs.map((l) => (l === intc ? recut.leg : l))
    const sales = new Map<ProposedTradeLeg, LegSale>([...proposal.sales].map(([l, sale]) => (l === intc ? [recut.leg, recut.sale] : [l, sale])))

    const [before] = buildRebalancePreviews([{ account, ...proposal }], true, 0.005, MOCK_TODAY_ISO)
    const [after] = buildRebalancePreviews([{ account, legs, sales, heldBack: proposal.heldBack }], true, 0.005, MOCK_TODAY_ISO)
    expect(after!.trades.find((t) => t.symbol === 'INTC')?.repurchaseBlockedUntil).toBe('2026-03-27')
    const lossNoLongerRealised = recut.leg.realisedLongTerm - intc.realisedLongTerm   // −19,650 − (−45,850)
    expect(lossNoLongerRealised).toBe(26_200)
    // Both estimates are rounded to the dollar, so their difference is within a dollar of the exact figure.
    expect(Math.abs(after!.estimatedTaxImpact - before!.estimatedTaxImpact - lossNoLongerRealised * LONG_TERM_RATE)).toBeLessThanOrEqual(1)
  })
})
