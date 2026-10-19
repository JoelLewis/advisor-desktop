import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { requireProspect } from '../prospects'
import {
  buildProspectVersion, createProspectProposal, parseProspectConstraints, readableProspectProposals, reviseProspectProposal,
} from '../prospect-proposals'
import { ADRIAN, withHerReply } from './prospect-fixture'
import { clientSummaryOf } from '@/mocks/agents/prospect-proposal-agent'
import { bandFor } from '@/lib/risk-profile'
import { riskScoreOf } from '@/mocks/reference/risk-score'
import { modelVolatility } from '@/mocks/reference/models'

const created = () => {
  const r = createProspectProposal(ADRIAN, 'prsp-011')
  if (!r.ok) throw new Error(r.message)
  return r.detail
}
/** The letter she reads with v1. */
const letter = () => {
  withHerReply()
  const summary = created().versions[0]?.clientSummary
  if (summary === undefined) throw new Error('v1 has no letter')
  return summary
}
const digitFree = (text: string) => expect(text.replace(/403\(b\)|401\(k\)/g, ''), text).not.toMatch(/\d/)

describe('drafting her proposal', () => {
  it("a prospect proposal's model is her band's own model, so the tolerance check never applies and her best-interest record needs no suitability reason", () => {
    withHerReply()
    const v1 = created().versions[0]!
    expect(bandFor(riskScoreOf(modelVolatility(v1.modelId))).profile).toBe(bandFor(v1.score).profile)
  })

  it('waits for her questionnaire and her statements', () => {
    expect(createProspectProposal(ADRIAN, 'prsp-011')).toEqual({ ok: false, status: 409, code: 'NO_QUESTIONNAIRE', message: 'Her questionnaire is not on file yet.' })
    const record = withHerReply()
    record.statements = []
    expect(createProspectProposal(ADRIAN, 'prsp-011')).toEqual({ ok: false, status: 409, code: 'NO_STATEMENTS', message: 'Her statements are not on file yet.' })
    expect(store().prospectProposals).toEqual([])
  })

  it('v1: Growth, one taxable account, everything in kind, nothing sold, the tiered fee, the 25 Feb close', () => {
    withHerReply()
    const detail = created()
    expect(detail).toMatchObject({ id: 'pprop-0001', prospectId: 'prsp-011', title: 'Pell proposal', threadId: 'th-pell-work' })
    const v1 = detail.versions[0]
    expect(v1).toMatchObject({
      n: 1, author: { kind: 'agent', agentId: 'proposal' }, constraints: [], score: 66, profileLabel: 'Moderate Aggressive', modelId: 'mod-002', modelName: 'Growth',
      cash: 100_782, transferValue: 2_100_000, totalAssets: 3_000_000, tranches: [], pricesAsOf: '2026-02-25',
      fees: { scheduleName: 'Comprehensive Wealth Management', base: 2_100_000, annual: 20_850 },
      heldAway: [{ custodian: 'TIAA', value: 900_000, rollover: 'asked_about' }],
      concentration: { symbol: 'SYK', unrealized: 481_378, taxIfSoldNow: 114_567.96 },
      changeSummary: "Drafted from her questionnaire's model, Growth: one individual taxable account, everything transferred in kind, nothing sold.",
    })
    expect(v1?.transfer.every((l) => l.plan === 'in_kind')).toBe(true)
    expect(v1?.fees.blendedRate).toBeCloseTo(0.0099286, 6)
    expect(v1?.sleeves.find((s) => s.assetClass === 'us_equity')).toMatchObject({ target: 0.55 })
    expect(v1?.sleeves.find((s) => s.assetClass === 'us_equity')?.transferred).toBeCloseTo(1_999_218 / 2_100_000, 10)
    expect(v1?.fingerprint).toMatch(/^[0-9A-F]{8}$/)
    digitFree(v1?.changeSummary ?? '')
    expect(store().messages.filter((m) => m.threadId === 'th-pell-work').map((m) => m.kind)).toEqual(['prospect_proposal'])
  })

  it('writes what she will read: plain figures, the rollover asked about, the estimates hedged, the close named, no recommendation to roll over', () => {
    const summary = letter()
    expect(summary).toContain('Dear Dr. Pell,')
    expect(summary).toContain('We recommend our Growth model, the one your answers point to: about 75% in stocks and 25% in bonds, alternatives, commodities and cash.')
    expect(summary).toContain('Stryker Corp. (SYK): 1,390 shares, $542,378, about 18% of your total assets across both accounts.')
    expect(summary).toContain('a long-term gain of about $481,400, with an estimated federal tax of about $114,600 (an estimate; please check with your tax professional)')
    expect(summary).toContain("You asked about moving your TIAA 403(b). We'll compare the options and come back to you.")
    expect(summary).toContain("Fees: an estimated $20,850 a year on today's value of $2,100,000 (a blended 0.99%), from our tiered schedule; the fee moves with the account's value.")
    expect(summary).toContain('State tax is not modeled.')
    expect(summary).toContain('Prices as of the February 25, 2026 close.')
    expect(summary).toContain('Adrian Hale\nLarkfield Advisory')
    expect(summary).not.toMatch(/cleared|would exceed|the firm's model|US Equity/i)
    expect(summary.match(/recommend/gi), 'the one recommendation is the model').toEqual(['recommend'])
    expect(summary).not.toMatch(/recommend\w* (a |that you )?(roll|mov)/i)
  })

  it('opens with her goals and the Stryker position her statements show, then recommends the model once', () => {
    const summary = letter()
    const [greeting, , opening, , proposal] = summary.split('\n')
    expect(greeting).toBe('Dear Dr. Pell,')
    expect(opening).toBe(
      'Thank you for your questionnaire and your statements. You told us your goal is to maximize long-term growth over a horizon of more than 20 years. '
      + 'Your statements show a large, low-basis Stryker Corp. position, and we want to address it with you.')
    expect(proposal).toMatch(/^We recommend our Growth model, the one your answers point to/)
    expect(summary).not.toMatch(/This is our proposal\.|Here is what we propose|you asked us what to do/)
  })

  it('words every goal and horizon the questionnaire offers as a sentence, ranges with en dashes', () => {
    withHerReply()
    const v1 = created().versions[0]!
    const record = requireProspect('prsp-011')
    const questionnaire = record.questionnaire
    if (!questionnaire) throw new Error('she has no questionnaire')
    const answered = (horizon: number, goal: number) => ({
      ...record,
      questionnaire: { ...questionnaire, answers: [{ questionId: 'rq-01', selectedOption: horizon }, { questionId: 'rq-03', selectedOption: goal }] },
    })
    const openingOf = (horizon: number, goal: number) => clientSummaryOf(answered(horizon, goal), v1).split('\n')[2]
    expect(openingOf(1, 2)).toContain('your goal is to balance growth and income over a horizon of 3–5 years.')
    expect(openingOf(3, 4)).toContain('your goal is to pursue aggressive growth and accept significant risk over a horizon of 10–20 years.')
    for (let horizon = 0; horizon < 5; horizon++) for (let goal = 0; goal < 5; goal++) expect(openingOf(horizon, goal)).not.toMatch(/to [A-Z]|\d-\d/)
  })

  it('drops the collectibles sentence; tax lines are estimates to check with her tax professional', () => {
    const summary = letter()
    expect(summary).not.toMatch(/collectible|precious-metal/i)
    expect(summary).toContain('(an estimate; please check with your tax professional)')
    expect(summary).not.toMatch(/consult your tax professional|comparison to follow/)
  })

  it('says the rollover was asked about and a comparison follows', () => {
    expect(letter()).toContain("You asked about moving your TIAA 403(b). We'll compare the options and come back to you.")
  })

  it('states what she would hold if everything moves in kind against the model, and that reaching it takes sales', () => {
    withHerReply()
    const detail = created()
    expect(detail.versions[0]?.clientSummary).toContain('Moved in kind, about 95% of the account you move to us would be in US stocks (including Stryker Corp.), against 55% in the Growth model. Reaching the model would take sales, each a tax decision to make with your CPA.')
    expect(detail.bestInterestDraft.inKindVsModel).toBe('Moved in kind, about 95% of the account she moves to us would be in US stocks (including Stryker Corp.), against 55% in the Growth model. Reaching the model would take sales, each a tax decision to make with her CPA.')
  })

  it('a second ask returns the proposal already drafted', () => {
    withHerReply()
    created()
    expect(createProspectProposal(ADRIAN, 'prsp-011')).toMatchObject({ ok: true, created: false, detail: { id: 'pprop-0001' } })
    expect(store().prospectProposals).toHaveLength(1)
  })
})

describe('revising it', () => {
  it('documents a staged sale in two tax years, the tranches tying to the whole gain; nothing sold', () => {
    withHerReply()
    const { id } = created()
    const r = reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 2 }])
    if (!r.ok) throw new Error(r.message)
    const v2 = r.detail.versions[1]
    expect(v2?.tranches).toEqual([
      { n: 1, taxYear: 2026, shares: 695, proceeds: 271_189, gain: 240_689, tax: 57_283.98 },
      { n: 2, taxYear: 2027, shares: 695, proceeds: 271_189, gain: 240_689, tax: 57_283.98 },
    ])
    expect(v2?.changeSummary).toBe('Documented a phased sale of Stryker Corp. over two tax years, to decide with her CPA; nothing sold.')
    expect(v2?.clientSummary).toContain([
      'One option to decide with your CPA: selling Stryker Corp. in two parts, one in each tax year:',
      '- 2026: 695 shares, a gain of about $240,700, an estimated federal tax of about $57,300.',
      '- 2027: 695 shares, a gain of about $240,700, an estimated federal tax of about $57,300 at today\'s rates.',
      'Figures are at the February 25, 2026 close; gains in later years depend on the price when sold (an estimate; please check with your tax professional). Nothing is sold unless you decide to.',
    ].join('\n'))
    expect(v2?.fingerprint).not.toBe(r.detail.versions[0]?.fingerprint)
    expect(store().messages.filter((m) => m.kind === 'prospect_proposal_version').map((m) => m.kind === 'prospect_proposal_version' && m.version)).toEqual([2])
  })

  it('three tranches give the remainder to the last; a revision that changes nothing is refused; removing the staging is a version', () => {
    withHerReply()
    const { id } = created()
    const three = reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 3 }])
    if (!three.ok) throw new Error(three.message)
    expect(three.detail.versions[1]?.tranches.map((t) => t.shares)).toEqual([463, 463, 464])
    expect(three.detail.versions[1]?.tranches.reduce((s, t) => s + t.gain, 0)).toBeCloseTo(481_378, 2)
    expect(reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 3 }])).toEqual({ ok: false, status: 409, code: 'NO_CHANGE', message: 'v2 already says that.' })
    const back = reviseProspectProposal(ADRIAN, id, [])
    if (!back.ok) throw new Error(back.message)
    expect(back.detail.versions[2]?.changeSummary).toBe('Removed the phased sale; everything transferred in kind, nothing sold.')
    expect(back.detail.versions[2]?.fingerprint).toBe(back.detail.versions[0]?.fingerprint)
  })

  it('is closed once sent', () => {
    withHerReply()
    const { id } = created()
    requireProspect('prsp-011').sent = { proposalId: id, version: 1, actId: 'REC-0009', messageId: 'msg-0099', at: '2026-02-26T15:00:00.000Z' }
    expect(reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 2 }])).toEqual({
      ok: false, status: 409, code: 'ALREADY_SENT', message: 'v1 was sent to her (REC-0009); this proposal is closed.',
    })
  })
})

describe('who may draft and read it', () => {
  it('members of her internal thread draft; Mark reads but does not draft; she and Robert are told it does not exist', () => {
    withHerReply()
    expect(createProspectProposal('cco-001', 'prsp-011')).toMatchObject({ ok: false, status: 403, code: 'NOT_A_MEMBER' })
    for (const viewer of ['prsp-011', 'cli-001']) expect(createProspectProposal(viewer, 'prsp-011')).toMatchObject({ ok: false, status: 404 })
    const { id } = created()
    expect(readableProspectProposals('cco-001', 'prsp-011')?.map((p) => p.id)).toEqual([id])
    expect(readableProspectProposals('prsp-011', 'prsp-011')).toBeUndefined()
    expect(reviseProspectProposal('prsp-011', id, [])).toMatchObject({ ok: false, status: 404 })
  })

  it('carries the best-interest draft for the latest version: a lower-risk model and staying self-directed, each with its cost', () => {
    withHerReply()
    const draft = created().bestInterestDraft
    expect(draft).toMatchObject({ score: 66, profileLabel: 'Moderate Aggressive', modelId: 'mod-002', modelName: 'Growth',
      costs: { scheduleName: 'Comprehensive Wealth Management', annualFee: 20_850 }, concentration: { symbol: 'SYK' },
      rollover: 'Rollover of the former employer 403(b): asked about; comparison to follow.' })
    expect(draft.alternatives.map((a) => [a.kind, a.name, a.annualFee])).toEqual([['lower_risk_model', 'Balanced Growth', 20_850], ['self_directed', 'Staying self-directed', 0]])
  })
})

describe('parsing a revision', () => {
  it.each([
    [[], true], [[{ kind: 'stage_diversification', tranches: 2 }], true], [[{ kind: 'stage_diversification', tranches: 4 }], false],
    [[{ kind: 'harvest_only' }], false], ['nope', false], [[{ kind: 'stage_diversification', tranches: 2 }, { kind: 'stage_diversification', tranches: 3 }], false],
  ] as const)('%j → %s', (value, ok) => expect(parseProspectConstraints(value).ok).toBe(ok))
})

describe('building is pure', () => {
  it('the same record and constraints build the same fingerprint', () => {
    const record = withHerReply()
    const a = buildProspectVersion(record, [])
    const b = buildProspectVersion(record, [])
    expect(a.ok && b.ok && a.built.fingerprint === b.built.fingerprint).toBe(true)
  })
})
