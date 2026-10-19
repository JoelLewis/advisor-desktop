import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { runDriftMonitor } from '@/mocks/agents/drift-monitor'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { runHarvestScanner } from '@/mocks/agents/harvest-scanner'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { taxReturnFor, ytdRealizedOnReturn } from '@/mocks/handlers/tax-return'
import { proposalById } from '@/mocks/data/proposals-store'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { createProposal } from '../proposals'
import { workingMovesOf } from '../household-ledger'
import { ADRIAN, approvedStoryV3, approvedV1, ok, release } from './story-fixture'
import { requireModelManaged } from '@/lib/mandate'

const subject = { type: 'account', id: 'acc-002' } as const
const ctx = { asOf: MOCK_NOW_ISO, subject }
const acc002 = accounts.find((a) => a.id === 'acc-002')!

describe("after the story's v3 fills, every engine read sees the moved book", () => {
  it('the Harvest Scanner offers no INTC harvest and shows the recorded sale through 2026-03-27', () => {
    release(approvedStoryV3())
    const findings = runHarvestScanner(ctx)
    expect(findings.some((f) => f.claim.startsWith('The remaining Intel Corp. shares can be sold at a loss today'))).toBe(false)
    const recorded = findings.find((f) => f.citations.some((c) => c.source === 'Wash-sale window · rs-006 · INTC loss sale of 25 Feb 2026 · Don\'t repurchase through 27 Mar 2026'))
    expect(recorded?.figures).toContainEqual({ label: 'Loss realized · INTC', value: -45_850, unit: 'USD', source: 'realizedSales.realizedGainLoss' })
  })

  it('the Drift Monitor measures the new holdings: US Equity still outside its band after a harvest-only version', () => {
    const a = approvedStoryV3()
    const projected = proposalById(a.proposalId)!.versions[2]!.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!.drift
    // The version measured its drift with the working QQQ buy filled; the book has not filled it, so the monitor reads that much less US equity.
    const workingUs = workingMovesOf('acc-002', a.proposalId).filter((w) => w.assetClass === 'us_equity')
      .reduce((s, w) => s + (w.side === 'buy' ? w.estimatedValue : -w.estimatedValue), 0) / acc002.totalValue
    release(a)
    const [first] = runDriftMonitor(ctx)
    expect(first?.claim).toBe('US Equity is outside its tolerance band.')
    expect(Math.abs(first!.figures[0]!.value - (projected - workingUs))).toBeLessThan(0.0005)
  })

  it('the return-level results include the realized INTC loss', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealizedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    release(approvedStoryV3())
    expect(ytdRealizedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 45_850)
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

  it("v1's AGG purchase washes part of acc-002's own AGG loss: the account's loss lots compete for it, not another account's", () => {
    release(approvedV1())
    const agg = generateTaxLotsWithSaleRisk('acc-002', acc002.totalValue).find((l) => l.id === 'lot-pos-024-0')!
    expect(agg.gainLoss).toBeLessThan(0)
    expect(agg.saleWash).toEqual({ deferredShares: 1577, disallowedShares: 0 })
    // The firm bought AGG today, so the Harvest Scanner does not offer it; the lots still carry the wash.
    const findings = runHarvestScanner(ctx)
    expect(findings.find((f) => f.figures.some((g) => g.label === 'Loss allowed now · AGG'))).toBeUndefined()
    expect(findings.find((f) => f.topic.kind === 'bought_today' && f.topic.symbol === 'AGG')).toBeDefined()
    const acc001 = accounts.find((a) => a.id === 'acc-001')!
    const aggInAcc001 = generateTaxLotsWithSaleRisk('acc-001', acc001.totalValue).find((l) => l.id === 'lot-pos-007-0')!
    expect(aggInAcc001.saleWash.deferredShares).toBe(1577)
  })

  it("the drift reading is as of the account's last fill, not the morning", () => {
    expect(computeDriftForAccount(requireModelManaged(acc002)).lastCalculated).toBe(MOCK_NOW_ISO)
    release(approvedV1())
    const lastFill = ledgerFills().filter((f) => f.accountId === 'acc-002').map((f) => f.at).sort().pop()!
    expect(lastFill > MOCK_NOW_ISO).toBe(true)
    expect(computeDriftForAccount(requireModelManaged(acc002)).lastCalculated).toBe(lastFill)
  })
})
