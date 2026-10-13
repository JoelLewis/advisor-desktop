import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { runDriftMonitor } from '@/mocks/agents/drift-monitor'
import { runHarvestScanner } from '@/mocks/agents/harvest-scanner'
import { taxReturnFor, ytdRealisedOnReturn } from '@/mocks/handlers/tax-return'
import { proposalById } from '@/mocks/data/proposals-store'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { createProposal } from '../proposals'
import { ADRIAN, approvedStoryV3, approvedV1, ok, release } from './story-fixture'

const subject = { type: 'account', id: 'acc-002' } as const
const ctx = { asOf: MOCK_NOW_ISO, subject }
const acc002 = accounts.find((a) => a.id === 'acc-002')!

describe("after the story's v3 fills, every engine read sees the moved book", () => {
  it('the Harvest Scanner offers no INTC harvest and shows the recorded sale through 2026-03-27', () => {
    release(approvedStoryV3())
    const findings = runHarvestScanner(ctx)
    expect(findings.some((f) => f.claim.startsWith('Intel Corp. can be sold at a loss today'))).toBe(false)
    const recorded = findings.find((f) => f.citations.some((c) => c.source === 'Wash-sale window · rs-006 · INTC loss sale of 2026-02-25, open through 2026-03-27'))
    expect(recorded?.figures).toContainEqual({ label: 'Loss realised · INTC', value: -45_850, unit: 'USD', source: 'realisedSales.realisedGainLoss' })
  })

  it('the Drift Monitor measures the new holdings: US Equity still outside its band after a harvest-only version', () => {
    const a = approvedStoryV3()
    const projected = proposalById(a.proposalId)!.versions[2]!.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!.drift
    release(a)
    const [first] = runDriftMonitor(ctx)
    expect(first?.claim).toBe('US Equity is outside its tolerance band.')
    expect(Math.abs(first!.figures[0]!.value - projected)).toBeLessThan(0.0005)
  })

  it('the return-level results include the realised INTC loss', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    release(approvedStoryV3())
    expect(ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 45_850)
  })
})

describe('after v1 (the full rebalance) fills', () => {
  it('the Drift Monitor reports every class inside its band; private equity remains, for its own reason', () => {
    const a = approvedV1()
    const v1PrivateEquity = proposalById(a.proposalId)!.versions[0]!.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    release(a)
    const claims = runDriftMonitor(ctx).map((f) => f.claim)
    expect(claims[0]).toBe('Every asset class is inside its tolerance band.')
    expect(claims).toContain("Private Equity cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows.")
    const next = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).detail.versions[0]!
    const privateEquity = next.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    expect(privateEquity.residualReason).toBeDefined()
    expect(privateEquity.residualReason).toBe(v1PrivateEquity.residualReason)
  })
})
