import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { createProposal, reviseProposal } from '@/mocks/workspace/proposals'
import { approveProposal } from '@/mocks/workspace/proposal-acts'
import { ORDINARY_INCOME_OFFSET_LIMIT, capitalLossUse } from '@/lib/capital-gains'
import { buildClientRateDisclosure, RATE_DISCLOSURE, TAX_RATE_BASIS } from '@/lib/tax-rules'
import { clientDate, clientMoney, clientPercent } from '@/kit/measure'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'
import type { ProposalVersion } from '@/types/workspace-proposal'
import { writeClientLetter } from '../client-letter'
import { requireModelManaged } from '@/lib/mandate'
import { JOHNSON_REASON } from '@/test/suitability-fixture'

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
    const drift = computeDriftForAccount(requireModelManaged(accounts.find((a) => a.id === 'acc-002')!))
    const usEquity = drift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(letter.figures).toEqual([
      { label: 'US stocks before the rebalance', value: usEquity.actual, unit: '%', source: 'drift.assetClassDrifts.actual' },
      { label: 'US stocks target', value: usEquity.target, unit: '%', source: 'drift.assetClassDrifts.target' },
      { label: 'INTC loss', value: intc.realizedShortTerm + intc.realizedLongTerm, unit: 'USD', source: 'version.preview.trades.INTC realized, less any washed part' },
      { label: 'Estimated tax on the return', value: v1.preview.estimatedTaxImpact, unit: 'USD', source: 'version.preview.estimatedTaxImpact' },
    ])
    expect(letter.body).toContain(`${clientPercent(usEquity.actual)} of the account against a ${clientPercent(usEquity.target)} target`)
  })

  it('states the expected loss and the dates conditionally, the look-back, DRIP and held-away accounts, the estimate and the disclosure', () => {
    const { letter } = v1Letter()
    expect(letter.body.startsWith('Dear Robert,')).toBe(true)
    expect(letter.body).toContain('We plan to rebalance your individual account to bring it back in line with its Growth model.')
    expect(letter.body).toContain('so we plan to sell some holdings and add to the areas below their targets')
    expect(letter.body).toContain('which can offset capital gains, now or in later years. To avoid postponing or losing that loss, if the sale')
    expect(letter.body).toContain(`is expected to realize a loss of about ${clientMoney(45_900)} at today's prices`)
    expect(letter.body).toContain(`To avoid postponing or losing that loss, if the sale is made on ${clientDate('2026-02-25')}, please don't repurchase Intel Corp. in any of your accounts or Patricia's, including IRAs, through ${clientDate('2026-03-27')}. A purchase in that period`)
    expect(letter.body).toContain(`If the sale is made on ${clientDate('2026-02-25')}, please also tell us before the sale if you or Patricia have bought Intel Corp. in any account on or after ${clientDate('2026-01-26')}, because that can affect the loss`)
    expect(letter.body).toContain("in any of your accounts or Patricia's, including IRAs")
    expect(letter.body).toContain('would not forfeit the loss but would postpone it')
    expect(letter.body).toContain('dividends set to reinvest automatically')
    expect(letter.body).toContain(`If the sale is made on ${clientDate('2026-02-25')} and any account reinvests dividends into Intel Corp., please turn that off through ${clientDate('2026-03-27')}, and check with us`)
    expect(letter.body).not.toMatch(/until then/)
    expect(letter.body).toContain("your Vanguard 401(k) and Patricia's TIAA 403(b)")
    expect(letter.body).toContain(`about ${clientMoney(14_500)} of federal tax on these gains, including the 3.8% net investment income tax, added to your joint return for 2026`)
    expect(letter.body).toContain(buildClientRateDisclosure(TAX_RATE_BASIS, { collectibles: true }))
    expect(letter.body).not.toContain(RATE_DISCLOSURE)
    expect(letter.body).toContain('with our compliance team for review before any is placed')
    expect(letter.body.endsWith('Adrian Hale\nLarkfield Advisory')).toBe(true)
    expect(letter.body).not.toMatch(/cleared|household|realis|We have approved/i)
  })

  it('tells the collectibles rate only to a reader who trades or holds one in the account', () => {
    const { v1, letter } = v1Letter()
    expect(v1.preview.trades.map((t) => t.symbol)).toContain('GLD')
    expect(letter.body).toContain(buildClientRateDisclosure(TAX_RATE_BASIS, { collectibles: true }))
    const proposal = store().proposals[0]!
    const noGold: ProposalVersion = { ...v1, preview: { ...v1.preview, trades: v1.preview.trades.filter((t) => t.symbol !== 'GLD') } }
    const without = writeClientLetter(proposal, noGold, 'user-001')
    expect(without.body).toContain(buildClientRateDisclosure(TAX_RATE_BASIS, { collectibles: false }))
    expect(without.body).not.toMatch(/collectibles/)
  })

  it('an IRA or Roth IRA buyback loses the loss for good; an employer plan only may be treated the same way', () => {
    const { letter } = v1Letter()
    expect(letter.body).toContain('a purchase in an IRA or Roth IRA would lose it permanently, and a purchase in an employer plan such as a 401(k) or 403(b) may be treated the same way.')
    expect(letter.body).not.toMatch(/(401\(k\)|403\(b\))[^.]*would lose it permanently/)
  })

  it('is in US spelling, and every forward statement is conditional on the sale', () => {
    const { letter } = v1Letter()
    expect(letter.body).not.toMatch(/\b\w*(realis|recognis|modell|organis|favour|behaviour|labell|cancell|centre|licence)\w*\b/i)
    expect(letter.body).not.toMatch(/\bcarries forward\b|\buntil then\b/)
    // Every date the client must act by follows its condition in the same sentence.
    const condition = `the sale is made on ${clientDate('2026-02-25')}`
    for (const date of [clientDate('2026-03-27'), clientDate('2026-03-28'), clientDate('2026-01-26')]) {
      for (const at of [...letter.body.matchAll(new RegExp(date, 'g'))].map((m) => m.index)) {
        const before = letter.body.slice(0, at)
        const sentenceStart = Math.max(before.lastIndexOf('\n'), before.search(/[.;] [A-Z][^.]*$/))
        expect(before.slice(sentenceStart).toLowerCase(), date).toContain(condition.toLowerCase())
      }
    }
  })

  it('an approved harvest-only version adds no tax: it says so, and states the net capital loss from the engine', () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    const revised = reviseProposal('user-001', created.detail.id, [{ kind: 'harvest_only' }])
    if (!revised.ok) throw new Error(revised.message)
    const v2 = revised.detail.versions[1]!
    const approved = approveProposal('user-001', created.detail.id, 2, v2.fingerprint, JOHNSON_REASON)
    if (!approved.ok) throw new Error(approved.message)
    expect(v2.preview.estimatedTaxImpact).toBeLessThanOrEqual(0)
    const letter = writeClientLetter(revised.detail, v2, 'user-001')
    const ytd = v2.preview.ytdRealizedOnReturn!
    const intc = v2.preview.trades.find((t) => t.symbol === 'INTC')!
    const use = capitalLossUse(ytd.shortTerm + ytd.longTerm, intc.realizedShortTerm + intc.realizedLongTerm, ORDINARY_INCOME_OFFSET_LIMIT)
    expect(use.carriedForward).toBeGreaterThan(0)
    expect(letter.body).toContain('We plan to move your individual account toward its Growth model.')
    expect(letter.body).toContain('so we plan to sell only a holding at a loss and add to the areas below their targets')
    expect(letter.body).not.toMatch(/bring it back in line|sell some holdings/)
    expect(letter.body).toContain('we expect no federal capital-gains tax from these sales on your joint return for 2026')
    expect(letter.body).not.toContain(`${clientMoney(0)} of federal`)
    expect(letter.body).toContain(`Up to ${clientMoney(ORDINARY_INCOME_OFFSET_LIMIT)} of net capital loss can offset ordinary income each year`)
    expect(letter.body).toContain(`about ${clientMoney(Math.round(use.carriedForward / 100) * 100)} of this loss would carry forward to later years`)
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
  /** The harvest-only version on a return that had already realized `ytdLongTerm` this year, with a stated estimate: these tests exercise the letter's branches, not the engine's pricing. */
  const onReturnWith = (v2: ProposalVersion, ytdLongTerm: number, estimatedTaxImpact: number): ProposalVersion =>
    ({ ...v2, preview: { ...v2.preview, estimatedTaxImpact, ytdRealizedOnReturn: { shortTerm: 0, longTerm: ytdLongTerm, collectibleLongTerm: 0 } } })

  it('a gains cap moves toward the model while limiting the gains it realizes', () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    const revised = reviseProposal('user-001', created.detail.id, [{ kind: 'cap_realized_gains', usd: 20_000 }])
    if (!revised.ok) throw new Error(revised.message)
    const letter = writeClientLetter(revised.detail, revised.detail.versions[1]!, 'user-001')
    expect(letter.body).toContain('We plan to move your individual account toward its Growth model while limiting the gains it realizes.')
    expect(letter.body).not.toContain('bring it back in line')
  })

  it('a saving against gains already realized is stated, with no loss left to use', () => {
    const { proposal, v2 } = harvestOnlyV2()
    const loss = v2.preview.trades.find((t) => t.symbol === 'INTC')!.realizedLongTerm
    // The year's gains exceed the loss, so the return keeps a net gain and the harvest only saves tax on it.
    const version = onReturnWith(v2, -loss + 10_000, -10_913)
    const letter = writeClientLetter(proposal, version, 'user-001')
    expect(letter.body).toContain('we expect no federal capital-gains tax from these sales on your joint return for 2026')
    expect(letter.body).toContain(`reduce the federal tax on gains already realized this year, including the 3.8% net investment income tax, by about ${clientMoney(10_900)}`)
    expect(letter.body).not.toContain('net capital loss')
    expect(letter.figures.map((f) => f.label)).not.toContain('Loss carried forward')
  })

  it('a net loss within the limit offsets ordinary income and carries nothing forward', () => {
    const { proposal, v2 } = harvestOnlyV2()
    const loss = v2.preview.trades.find((t) => t.symbol === 'INTC')!.realizedLongTerm
    const ytd = -loss - 1_850
    const use = capitalLossUse(ytd, loss, ORDINARY_INCOME_OFFSET_LIMIT)
    expect(use).toEqual({ ordinaryIncomeOffset: 1_850, carriedForward: 0 })
    const letter = writeClientLetter(proposal, onReturnWith(v2, ytd, -10_472), 'user-001')
    expect(letter.body).toContain(`Up to ${clientMoney(ORDINARY_INCOME_OFFSET_LIMIT)} of net capital loss can offset ordinary income each year, so about ${clientMoney(1_900)} of this loss would offset ordinary income for 2026.`)
    expect(letter.body).not.toMatch(/carr(ies|y) forward/)
    expect(letter.figures).toContainEqual({ label: 'Loss offsetting ordinary income', value: 1_850, unit: 'USD', source: 'capitalLossUse.ordinaryIncomeOffset' })
  })
})
