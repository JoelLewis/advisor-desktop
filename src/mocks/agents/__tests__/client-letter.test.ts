import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { createProposal, reviseProposal } from '@/mocks/workspace/proposals'
import { approveProposal } from '@/mocks/workspace/proposal-acts'
import { ORDINARY_INCOME_OFFSET_LIMIT, capitalLossUse } from '@/lib/capital-gains'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { clientDate, clientMoney, clientPercent } from '@/kit/measure'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'
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
    expect(letter.body).toContain('We plan to rebalance your Robert Johnson Individual account')
    expect(letter.body).toContain(`is expected to realize a loss of about ${clientMoney(45_900)} at today's prices`)
    expect(letter.body).toContain(`if the sale is made on ${clientDate('2026-02-25')}, please don't buy Intel Corp. back`)
    expect(letter.body).toContain(`on or before ${clientDate('2026-03-27')}`)
    expect(letter.body).toContain(`From ${clientDate('2026-03-28')} you may buy it again.`)
    expect(letter.body).toContain(`tell us before the sale if you or Patricia have bought Intel Corp. in any account since ${clientDate('2026-01-26')}, because that can affect the loss`)
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
    expect(letter.body).toContain('we expect no federal capital-gains tax from these sales on your joint return for 2026')
    expect(letter.body).not.toContain(`${clientMoney(0)} of federal`)
    expect(letter.body).toContain(`Up to ${clientMoney(ORDINARY_INCOME_OFFSET_LIMIT)} of net capital loss can offset ordinary income each year`)
    expect(letter.body).toContain(`about ${clientMoney(Math.round(use.carriedForward / 100) * 100)} of this loss carries forward to later years`)
    expect(letter.figures).toContainEqual({ label: 'Loss carried forward', value: use.carriedForward, unit: 'USD', source: 'capitalLossUse.carriedForward' })
    expect(letter.figures).toContainEqual({ label: 'Loss offsetting ordinary income', value: use.ordinaryIncomeOffset, unit: 'USD', source: 'capitalLossUse.ordinaryIncomeOffset' })
  })
})
