import { describe, it, expect } from 'vitest'
import type { DraftPreview } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { harvestOpportunities } from '@/mocks/agents/harvest-scanner'
import { agentConstraints, draftSummary } from '@/mocks/agents/proposal-agent'
import { sameWashSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { buildVersion } from '../proposal-engine'

const built = (accountId: string): DraftPreview => {
  const r = buildVersion(accountId, agentConstraints([]), [])
  if (!r.ok) throw new Error(`${accountId}: ${r.message}`)
  return r.built
}
const flaggedFor = (accountId: string) => new Set(sameWashSaleTaxpayer(accounts.find((a) => a.id === accountId)!).flatMap(harvestOpportunities).map((o) => o.position.symbol))

describe('harvest-plus-substitute', () => {
  it("acc-043 harvests its CSBGU0.SW loss and buys the model's AGG in its place", () => {
    const v = built('acc-043')
    expect(v.harvestSubstitutions).toEqual([{
      assetClass: 'fixed_income', foreclosed: { symbol: 'CSBGU0.SW', name: expect.any(String) },
      bought: { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF' }, harvested: true,
    }])
    const sell = v.preview.trades.find((t) => t.symbol === 'CSBGU0.SW')
    expect(sell?.side).toBe('sell')
    expect(sell!.realisedShortTerm + sell!.realisedLongTerm).toBeLessThan(0)
    expect(v.legFacts.find((f) => f.symbol === 'CSBGU0.SW')!.lots.every((t) => t.realised <= 0)).toBe(true)
    expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'AGG')).toBe(true)
    expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'CSBGU0.SW')).toBe(false)
    const summary = draftSummary('acc-043', v)
    expect(summary).toContain('lots at a loss and buys iShares Core US Aggregate Bond ETF in their place, so that harvest is not foreclosed.')
    expect(summary).not.toMatch(/\d/)
  })

  it('acc-002 has no non-identical fixed-income substitute: the AGG buy stands and the agent says what it forecloses', () => {
    const v = built('acc-002')
    expect(v.harvestSubstitutions).toEqual([])
    expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'AGG')).toBe(true)
    expect(draftSummary('acc-002', v)).toContain('iShares Core US Aggregate Bond ETF is bought here, so its loss cannot be harvested for thirty days without a wash sale.')
  })

  it('across the book, a substitute is never a flagged harvest, and a harvest sells only loss lots', () => {
    let substituted = 0
    for (const account of accounts) {
      const v = built(account.id)
      const flagged = flaggedFor(account.id)
      for (const s of v.harvestSubstitutions) {
        substituted += 1
        expect(flagged.has(s.bought.symbol), `${account.id} buys flagged ${s.bought.symbol}`).toBe(false)
        expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === s.foreclosed.symbol), `${account.id} still buys ${s.foreclosed.symbol}`).toBe(false)
        if (s.harvested) expect(v.legFacts.find((f) => f.symbol === s.foreclosed.symbol)!.lots.every((t) => t.realised <= 0), account.id).toBe(true)
      }
    }
    expect(substituted).toBeGreaterThan(0)
  }, 120_000)
})
