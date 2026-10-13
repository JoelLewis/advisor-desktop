import { describe, it, expect } from 'vitest'
import { approvalWords, isApprovedLatest } from '@/workspace/proposal/approval-words'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import { driftRows } from '@/workspace/proposal/drift-rows'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { restrictionSource } from '@/workspace/proposal/restriction-words'
import type { DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'

describe('proposal wording', () => {
  it('states which version an approval applies to', () => {
    expect(approvalWords({ kind: 'unapproved', latestVersion: 2 })).toBe('v2 is not approved')
    expect(approvalWords({ kind: 'approved', version: 3, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001' })).toBe('v3 is approved')
    expect(approvalWords({ kind: 'approved', version: 2, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001' })).toBe('Approval applies to v2; v3 is unapproved')
    expect(isApprovedLatest({ kind: 'approved', version: 2, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001' })).toBe(false)
  })
  it('names every residual reason in the engine\'s terms, with the ruled wording', () => {
    expect(RESIDUAL_WORDS.cash_capped).toBe("held to the model's cash target")
    expect(RESIDUAL_WORDS.wash_sale_avoided).toBe('a buy that would wash a loss was skipped')
    for (const words of Object.values(RESIDUAL_WORDS)) {
      expect(words).not.toMatch(/cleared|would exceed|\d/i)
      expect(words.length).toBeLessThanOrEqual(40)
    }
  })
  it('links to the workbench, remembering the thread', () => {
    expect(proposalWorkbenchHref('prop-0001', 'th-johnson-review')).toBe('/proposals/prop-0001?from=th-johnson-review')
    expect(proposalWorkbenchHref('prop-0001')).toBe('/proposals/prop-0001')
  })
  it('keeps recorded and projected restrictions apart, with their sources', () => {
    expect(restrictionSource({ symbol: 'INTC', start: '2026-01-21', until: '2026-03-22', source: { kind: 'recorded', saleId: 'rs-001', accountId: 'acc-002', saleDate: '2026-02-20' } }))
      .toBe('recorded · sale rs-001 of 2026-02-20 in acc-002')
    expect(restrictionSource({ symbol: 'INTC', start: '2026-01-26', until: '2026-03-27', source: { kind: 'projected', accountId: 'acc-002', saleDate: '2026-02-25' } }))
      .toBe("projected · this proposal's sale in acc-002")
  })
  it('lists the classes that were out or still carry a reason, before beside after', () => {
    const before = { assetClassDrifts: [
      { assetClass: 'us_equity', target: 0.55, actual: 0.682, drift: 0.132 },
      { assetClass: 'commodities', target: 0.02, actual: 0.0199, drift: -0.0001 },
      { assetClass: 'private_equity', target: 0, actual: 0.0268, drift: 0.0268 },
    ] } as Pick<DriftStatus, 'assetClassDrifts'> as DriftStatus
    const after: ProjectedDrift = { driftTolerance: 0.05, driftThreshold: 0.005, totalDrift: 0, maxAbsDrift: 0.0268, withinBand: true, assetClassDrifts: [
      { assetClass: 'us_equity', target: 0.55, actual: 0.5501, drift: 0.0001 },
      { assetClass: 'commodities', target: 0.02, actual: 0.0199, drift: -0.0001 },
      { assetClass: 'private_equity', target: 0, actual: 0.0268, drift: 0.0268, residualReason: 'not_market_tradable' },
    ] }
    expect(driftRows(before, after)).toEqual([
      { assetClass: 'us_equity', before: 0.132, after: 0.0001 },
      { assetClass: 'private_equity', before: 0.0268, after: 0.0268, reason: 'not_market_tradable' },
    ])
  })

  it('a released version reads as released and filled, never as approved', () => {
    const released = { kind: 'released', version: 3, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001', releaseActId: 'REC-0003' } as const
    expect(approvalWords(released)).toBe('v3 was released by compliance and filled')
    expect(isApprovedLatest(released)).toBe(false)
  })
})
