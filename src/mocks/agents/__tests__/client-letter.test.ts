import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { createProposal, reviseProposal } from '@/mocks/workspace/proposals'
import { approveProposal } from '@/mocks/workspace/proposal-acts'
import { ORDINARY_INCOME_OFFSET_LIMIT, capitalLossUse } from '@/lib/capital-gains'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { clientDate, clientMoney, clientPercent } from '@/kit/measure'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'
import type { ProposalVersion } from '@/types/workspace-proposal'
import { writeClientLetter } from '../client-letter'

describe('the Client Letter Agent', () => {
  beforeEach(() => resetWorkspaceStore())
  const v1Letter = () => {
    const r = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!r.ok) throw new Error(r.message)
    const v1 = r.detail.versions[0]!
    return { v1, letter: writeClientLetter(r.detail, v1, 'user-001') }
  }

  it("figures are the version's figures: the INTC loss, the return-level estimate, and the drift that prompted it", () => {
    const { v1, letter } = v1Letter()
    const intc = v1.preview.trades.find((t) => t.symbol === 'INTC')!
    const drift = computeDriftForAccount(accounts.find((a) => a.id === 'acc-002')!)
    const usEquity = drift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(letter.figures).toEqual([
      { label: 'US stocks before the rebalance', value: usEquity.actual, unit: '%', source: 'drift.assetClassDrifts.actual' },
      { label: 'US stocks target', value: usEquity.target, unit: '%', source: 'drift.assetClassDrifts.target' },
      { label: 'INTC loss', value: intc.realisedShortTerm + intc.realisedLongTerm, unit: 'USD', source: 'version.preview.trades.INTC realised, less any washed part' },
      { label: 'Estimated tax on the return', value: v1.preview.estimatedTaxImpact, unit: 'USD', source: 'version.preview.estimatedTaxImpact' },
    ])
    expect(letter.body).toContain(`${clientPercent(usEquity.actual)} of the account against a ${clientPercent(usEquity.target)} target`)
  })

  it('states the expected loss and the dates conditionally, the look-back, DRIP and held-away accounts, the estimate and the disclosure', () => {
    const { letter } = v1Letter()
    expect(letter.body.startsWith('Dear Robert,')).toBe(true)
    expect(letter.body).toContain('We plan to rebalance your Robert Johnson Individual account to bring it back in line with its Growth model.')
    expect(letter.body).toContain('so we plan to sell some holdings and add to the areas below their targets')
    expect(letter.body).toContain('which can offset capital gains, now or in later years. To avoid postponing or losing that loss, if the sale')
    expect(letter.body).toContain(`is expected to realize a loss of about ${clientMoney(45_900)} at today's prices`)
    expect(letter.body).toContain(`if the sale is made on ${clientDate('2026-02-25')}, please don't buy Intel Corp. back`)
    expect(letter.body).toContain(`on or before ${clientDate('2026-03-27')}`)
    expect(letter.body).toContain(`If the sale is made then, from ${clientDate('2026-03-28')} you may buy it again.`)
    expect(letter.body).toContain(`tell us before the sale if you or Patricia have bought Intel Corp. in any account on or after ${clientDate('2026-01-26')}, because that can affect the loss`)
    expect(letter.body).toContain("in any of your accounts or Patricia's, including IRAs")
    expect(letter.body).toContain('would not forfeit the loss but would postpone it')
    expect(letter.body).toContain('a retirement account such as an IRA, Roth IRA, 401(k) or 403(b) would lose it permanently')
    expect(letter.body).toContain('dividends set to reinvest automatically')
    expect(letter.body).toContain('If any account reinvests dividends into Intel Corp.')
    expect(letter.body).toContain("your Vanguard 401(k) and Patricia's TIAA 403(b)")
    expect(letter.body).toContain(`about ${clientMoney(10_400)} of federal capital-gains tax added to your joint return for 2026`)
    expect(letter.body).toContain(RATE_DISCLOSURE)
    expect(letter.body).toContain('with our compliance team for review before any is placed')
    expect(letter.body.endsWith('Adrian Hale')).toBe(true)
    expect(letter.body).not.toMatch(/cleared|household|realis|We have approved/i)
  })

  it('an approved harvest-only version adds no tax: it says so, and states the net capital loss from the engine', () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    const revised = reviseProposal('user-001', created.detail.id, [{ kind: 'harvest_only' }])
    if (!revised.ok) throw new Error(revised.message)
    const v2 = revised.detail.versions[1]!
    const approved = approveProposal('user-001', created.detail.id, 2, v2.fingerprint)
    if (!approved.ok) throw new Error(approved.message)
    expect(v2.preview.estimatedTaxImpact).toBeLessThanOrEqual(0)
    const letter = writeClientLetter(revised.detail, v2, 'user-001')
    const ytd = v2.preview.ytdRealisedOnReturn!
    const intc = v2.preview.trades.find((t) => t.symbol === 'INTC')!
    const use = capitalLossUse(ytd.shortTerm + ytd.longTerm, intc.realisedShortTerm + intc.realisedLongTerm, ORDINARY_INCOME_OFFSET_LIMIT)
    expect(use.carriedForward).toBeGreaterThan(0)
    expect(letter.body).toContain('We plan to move your Robert Johnson Individual account toward its Growth model.')
    expect(letter.body).toContain('so we plan to sell only a holding at a loss and add to the areas below their targets')
    expect(letter.body).not.toMatch(/bring it back in line|sell some holdings/)
    expect(letter.body).toContain('we expect no federal capital-gains tax from these sales on your joint return for 2026')
    expect(letter.body).not.toContain(`${clientMoney(0)} of federal`)
    expect(letter.body).toContain(`Up to ${clientMoney(ORDINARY_INCOME_OFFSET_LIMIT)} of net capital loss can offset ordinary income each year`)
    expect(letter.body).toContain(`about ${clientMoney(Math.round(use.carriedForward / 100) * 100)} of this loss carries forward to later years`)
    expect(letter.figures).toContainEqual({ label: 'Loss carried forward', value: use.carriedForward, unit: 'USD', source: 'capitalLossUse.carriedForward' })
    expect(letter.figures).toContainEqual({ label: 'Loss offsetting ordinary income', value: use.ordinaryIncomeOffset, unit: 'USD', source: 'capitalLossUse.ordinaryIncomeOffset' })
  })

  const harvestOnlyV2 = () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    const revised = reviseProposal('user-001', created.detail.id, [{ kind: 'harvest_only' }])
    if (!revised.ok) throw new Error(revised.message)
    return { proposal: revised.detail, v2: revised.detail.versions[1]! }
  }
  /** The harvest-only version on a return that had already realised `ytdLongTerm` this year, with a stated estimate: these tests exercise the letter's branches, not the engine's pricing. */
  const onReturnWith = (v2: ProposalVersion, ytdLongTerm: number, estimatedTaxImpact: number): ProposalVersion =>
    ({ ...v2, preview: { ...v2.preview, estimatedTaxImpact, ytdRealisedOnReturn: { shortTerm: 0, longTerm: ytdLongTerm, collectibleLongTerm: 0 } } })

  it('a gains cap moves toward the model while limiting the gains it realizes', () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    const revised = reviseProposal('user-001', created.detail.id, [{ kind: 'cap_realised_gains', usd: 20_000 }])
    if (!revised.ok) throw new Error(revised.message)
    const letter = writeClientLetter(revised.detail, revised.detail.versions[1]!, 'user-001')
    expect(letter.body).toContain('We plan to move your Robert Johnson Individual account toward its Growth model while limiting the gains it realizes.')
    expect(letter.body).not.toContain('bring it back in line')
  })

  it('a saving against gains already realized is stated, with no loss left to use', () => {
    const { proposal, v2 } = harvestOnlyV2()
    const loss = v2.preview.trades.find((t) => t.symbol === 'INTC')!.realisedLongTerm
    // The year's gains exceed the loss, so the return keeps a net gain and the harvest only saves tax on it.
    const version = onReturnWith(v2, -loss + 10_000, -10_913)
    const letter = writeClientLetter(proposal, version, 'user-001')
    expect(letter.body).toContain('we expect no federal capital-gains tax from these sales on your joint return for 2026')
    expect(letter.body).toContain(`reduce the federal tax on gains already realized this year by about ${clientMoney(10_900)}`)
    expect(letter.body).not.toContain('net capital loss')
    expect(letter.figures.map((f) => f.label)).not.toContain('Loss carried forward')
  })

  it('a net loss within the limit offsets ordinary income and carries nothing forward', () => {
    const { proposal, v2 } = harvestOnlyV2()
    const loss = v2.preview.trades.find((t) => t.symbol === 'INTC')!.realisedLongTerm
    const ytd = -loss - 1_850
    const use = capitalLossUse(ytd, loss, ORDINARY_INCOME_OFFSET_LIMIT)
    expect(use).toEqual({ ordinaryIncomeOffset: 1_850, carriedForward: 0 })
    const letter = writeClientLetter(proposal, onReturnWith(v2, ytd, -10_472), 'user-001')
    expect(letter.body).toContain(`Up to ${clientMoney(ORDINARY_INCOME_OFFSET_LIMIT)} of net capital loss can offset ordinary income each year, so about ${clientMoney(1_900)} of this loss would offset ordinary income for 2026.`)
    expect(letter.body).not.toContain('carries forward')
    expect(letter.figures).toContainEqual({ label: 'Loss offsetting ordinary income', value: 1_850, unit: 'USD', source: 'capitalLossUse.ordinaryIncomeOffset' })
  })
})
