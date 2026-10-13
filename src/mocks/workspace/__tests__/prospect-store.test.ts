import { describe, it, expect } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { nbas } from '@/mocks/data/nbas'
import { SEED_LAST_SEQUENCE, SEED_MESSAGES } from '@/mocks/data/workspace-seed'
import { PELL_ANSWERS, PELL_STATEMENTS } from '@/mocks/data/prospect-script'
import { riskQuestions } from '@/mocks/data/onboarding'
import { advanceStage, prospectOf, prospectRevision, prospectSummaries, requireProspect, visibleProspect } from '../prospects'

describe('the prospect record', () => {
  it('seeds Dr. Pell at first contact, with her two threads and nothing on file', () => {
    expect(prospectOf('prsp-011')).toEqual({
      id: 'prsp-011', name: 'Dr. Amanda Pell', salutation: 'Dr. Pell', referredBy: 'cli-008',
      stage: 'contact', stageHistory: [{ stage: 'contact', at: '2026-02-20T14:30:00Z' }],
      threadId: 'th-pell', internalThreadId: 'th-pell-work', eventId: 'evt-004',
      statements: [], disclosures: [], steps: [], tasks: [],
    })
    expect(store().prospectProposals).toEqual([])
  })

  it('seeds her thread (she can see it) and its internal sibling (firm only)', () => {
    expect(store().threads.find((t) => t.id === 'th-pell')).toMatchObject({ title: 'Dr. Amanda Pell', visibility: 'client', partyId: 'prsp-011', subject: { type: 'prospect', id: 'prsp-011' } })
    expect(store().threads.find((t) => t.id === 'th-pell-work')).toMatchObject({ title: 'Pell · prospect work', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'] })
  })

  it('seeds her first message in her thread and the next-best action in the Brief, in seed order', () => {
    expect(SEED_MESSAGES.find((m) => m.id === 'msg-s07')).toMatchObject({ kind: 'text', threadId: 'th-pell', authorId: 'prsp-011' })
    expect(SEED_MESSAGES.find((m) => m.id === 'msg-s08')).toMatchObject({ kind: 'next_action', threadId: 'th-brief', nbaId: 'nba-015', title: 'Referral: Dr. Amanda Pell', targetThreadId: 'th-pell' })
    expect(SEED_LAST_SEQUENCE).toBe(8)
  })

  it('nba-015 opens her thread', () => {
    expect(nbas.find((n) => n.id === 'nba-015')?.actionRoute).toEqual({ path: '/t/th-pell' })
  })

  it('a firm viewer who can see her internal thread may read her; she, Robert and nobody may not', () => {
    for (const viewer of ['user-001', 'user-002', 'user-003', 'cco-001']) expect(visibleProspect(viewer, 'prsp-011')?.id, viewer).toBe('prsp-011')
    for (const viewer of ['prsp-011', 'cli-001', 'nobody']) expect(visibleProspect(viewer, 'prsp-011'), viewer).toBeUndefined()
    expect(prospectSummaries('user-001')).toEqual([{ id: 'prsp-011', name: 'Dr. Amanda Pell', stage: 'contact', threadId: 'th-pell', internalThreadId: 'th-pell-work' }])
    expect(prospectSummaries('prsp-011')).toBeUndefined()
  })

  it('moves her stage forward only, recording when', () => {
    const p = requireProspect('prsp-011')
    advanceStage(p, 'discovery', '2026-02-26T14:10:00.000Z')
    advanceStage(p, 'contact', '2026-02-26T14:11:00.000Z')
    expect(p.stage).toBe('discovery')
    expect(p.stageHistory.map((h) => h.stage)).toEqual(['contact', 'discovery'])
  })

  it('a reset restores the seed', () => {
    requireProspect('prsp-011').steps.push({ kind: 'questionnaire', at: 'x', messageId: 'm', viaPresenter: { presenterId: 'user-001', path: 'scripted' } })
    expect(prospectRevision('prsp-011')).toBe(1)
    resetWorkspaceStore()
    expect(prospectRevision('prsp-011')).toBe(0)
    expect(requireProspect('prsp-011').steps).toEqual([])
  })
})

describe('her script', () => {
  it('answers every question once, inside its options, averaging 66', () => {
    expect(PELL_ANSWERS.map((a) => a.questionId)).toEqual(riskQuestions.map((q) => q.id))
    const scores = PELL_ANSWERS.map((a) => riskQuestions.find((q) => q.id === a.questionId)?.options[a.selectedOption]?.score ?? Number.NaN)
    expect(Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)).toBe(66)
  })

  it('states two month-end statements: a Fidelity taxable account and a TIAA 403(b)', () => {
    expect(PELL_STATEMENTS.map((s) => [s.id, s.custodian, s.accountType, s.asOf])).toEqual([
      ['stmt-pell-1', 'Fidelity', 'taxable_brokerage', '2026-01-31'], ['stmt-pell-2', 'TIAA', '403b', '2026-01-31'],
    ])
    expect(PELL_STATEMENTS[0]?.holdings.map((h) => [h.symbol, h.quantity, h.costBasis, h.acquired])).toEqual([
      ['SPY', 2_800, 1_010_000, '2016-08-15'], ['SYK', 1_390, 61_000, '2008-05-12'],
    ])
  })
})
