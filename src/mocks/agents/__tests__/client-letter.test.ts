import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { createProposal } from '@/mocks/workspace/proposals'
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

  it('states the loss, the last day not to buy back, DRIP and held-away accounts, the estimate and the disclosure', () => {
    const { letter } = v1Letter()
    expect(letter.body.startsWith('Dear Robert,')).toBe(true)
    expect(letter.body).toContain(`realises a loss of ${clientMoney(45_850)}`)
    expect(letter.body).toContain(`on or before ${clientDate('2026-03-27')}`)
    expect(letter.body).toContain(`From ${clientDate('2026-03-28')} you may buy it again.`)
    expect(letter.body).toContain("in any of your accounts or Patricia's, including IRAs")
    expect(letter.body).toContain('dividends set to reinvest automatically')
    expect(letter.body).toContain("your Vanguard 401(k) and Patricia's TIAA 403(b)")
    expect(letter.body).toContain(`about ${clientMoney(10_422)} of federal capital-gains tax added to your joint return for 2026`)
    expect(letter.body).toContain(RATE_DISCLOSURE)
    expect(letter.body).toContain('with our compliance team for review before any is placed')
    expect(letter.body.endsWith('Adrian Hale')).toBe(true)
    expect(letter.body).not.toMatch(/cleared|household/i)
  })
})
