import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import { householdLedger, householdLedgerAt, type HouseholdLedger } from '@/mocks/workspace/household-ledger'
import { carryFinding } from '@/mocks/workspace/carry'
import { createProposal, reviseProposal, saveVersion } from '@/mocks/workspace/proposals'
import { approveProposal } from '@/mocks/workspace/proposal-acts'
import { releaseOrders } from '@/mocks/workspace/compliance-acts'
import { runAgent } from '@/mocks/workspace/run-agent'
import { remeasureBrief } from '@/mocks/workspace/brief-remeasure'
import { draftMeetingNotes, runMeetingPrep } from '@/mocks/workspace/meeting-agents'
import { holdMeeting, meetingView } from '@/mocks/workspace/meetings'
import { fileMeetingRecord } from '@/mocks/workspace/meeting-acts'
import { draftRecap } from '@/mocks/workspace/recap'
import { sendToParty } from '@/mocks/workspace/acts'
import { advanceProspect, recordCoffee } from '@/mocks/workspace/prospect-steps'
import { createProspectProposal, reviseProspectProposal } from '@/mocks/workspace/prospect-proposals'
import { takeToTeamThread } from '@/mocks/reference/take'
import { PELL_WORK_THREAD_ID } from '@/mocks/data/prospect-seed'
import { approveProspectProposal, sendProspectProposal } from '@/mocks/workspace/prospect-acts'
import { deliverDisclosure } from '@/mocks/workspace/disclosures'
import { approvedStoryV3, ok, release } from '@/mocks/workspace/__tests__/story-fixture'
import { disagreements, newClaims, standingClaims, type Claim } from './ledger-claims'
import { runPretradeCheck } from '@/mocks/agents/pretrade-check'
import { MOCK_NOW_ISO } from '@/lib/clock'

const ADRIAN = 'user-001'
const MARK = 'cco-001'
const PELL = 'prsp-011'

/** What a step must have given the guard to read, so that it never passes on nothing: claims, client-letter lines, and the rules they met. */
type Expected = { claims: number; letterLines?: number; rules: readonly string[] }

/**
 * Checks every claim made since the last check against the ledger as it stands now; the notes, which record the
 * meeting, against the ledger as it stood when the meeting ended. Returns the rules it used.
 */
/** Claims grouped by the ledger they are read against: their household's, for their day or as of their meeting's end; none for a prospect's. */
function byReading(claims: readonly Claim[]): { claims: Claim[]; ledger: HouseholdLedger | undefined }[] {
  const keyOf = (c: Claim) => `${c.householdId ?? '-'}|${c.asOf ?? c.day}`
  return [...new Set(claims.map(keyOf))].map((key) => {
    const these = claims.filter((c) => keyOf(c) === key)
    const first = these[0]
    if (!first) throw new Error('a reading with no claims')
    const { householdId, asOf, day } = first
    const ledger = householdId === undefined ? undefined : asOf === undefined ? householdLedger(householdId, day) : householdLedgerAt(householdId, asOf)
    return { claims: these, ledger }
  })
}

/** Opens the Brief (it re-measures if the day or the book moved) and checks that everything it says now is true for the session's day. */
function standingTrue(step: string) {
  remeasureBrief()
  const standing = standingClaims()
  expect(standing.length, `${step}: standing claims`).toBeGreaterThan(0)
  for (const group of byReading(standing)) {
    const { unguarded, disagreeing } = disagreements(group.claims, group.ledger)
    expect(unguarded, `${step}: standing claims no rule checks`).toEqual([])
    expect(disagreeing, `${step}: standing claims untrue today`).toEqual([])
  }
}

function checker() {
  const seen = new Set<string>()
  const used = new Set<string>()
  let checked = 0
  const check = (step: string, expected: Expected) => {
    const claims = newClaims(seen)
    checked += claims.length
    const usedHere = new Set<string>()
    for (const group of byReading(claims)) {
      const { unguarded, disagreeing, rulesUsed } = disagreements(group.claims, group.ledger)
      rulesUsed.forEach((r) => usedHere.add(r))
      expect(unguarded, `${step}: claims about trades, fills or holdings that no rule checks`).toEqual([])
      expect(disagreeing, `${step}: claims the ledger contradicts`).toEqual([])
    }
    usedHere.forEach((r) => used.add(r))
    expect(claims.length, `${step}: claims checked`).toBeGreaterThanOrEqual(expected.claims)
    expect(claims.filter((c) => c.source === 'letter').length, `${step}: client-letter lines checked`).toBeGreaterThanOrEqual(expected.letterLines ?? 0)
    expect([...usedHere].sort(), `${step}: rules the step's claims met`).toEqual(expect.arrayContaining([...expected.rules]))
    
    
  }
  return { check, used, count: () => checked }
}

function heldDraftedFiled() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  const fingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
  if (!fingerprint) throw new Error('the notes have a fingerprint')
  ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
}

/** "Demo · skip to her reply · Thu 26 Feb 09:10 ET", with the coffee it follows. */
function jumpToHerReply() {
  ok(recordCoffee(ADRIAN, PELL, 'Coffee after the introduction.'))
  ok(advanceProspect(ADRIAN, PELL, 'reply'))
}

/** Her proposal approved and sent with its disclosures, then "Demo · skip to her acceptance · Mon 2 Mar 10:00 ET". */
function jumpToHerAcceptance() {
  const { detail } = ok(createProspectProposal(ADRIAN, PELL))
  const v1 = detail.versions[0]
  if (!v1) throw new Error('her v1 exists')
  ok(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, 'Growth fits her answers.'))
  ok(deliverDisclosure(ADRIAN, PELL, 'form_crs'))
  ok(sendProspectProposal(ADRIAN, detail.id))
  ok(advanceProspect(ADRIAN, PELL, 'acceptance'))
}

const BRIEF_AT_START = { claims: 18, rules: ['harvest offered', 'realized loss', 'replacement held', 'held away named', 'illiquid holding', 'suitability: model against tolerance', 'summary reads a standing finding'] } as const
const NOTES = { claims: 23, rules: ['notes: the rebalance', "notes: Patricia's accounts", 'Intel restriction', "no trades in Patricia's accounts"] } as const
const RECAP_SENT = { claims: 32, letterLines: 32, rules: ['letter: the Intel window', "no trades in Patricia's accounts", 'Intel restriction', 'letter: met today'] } as const
/** The recap sent on a later day than the meeting: it dates the meeting instead of saying today. */
const RECAP_SENT_LATER = { ...RECAP_SENT, rules: ['letter: the Intel window', "no trades in Patricia's accounts", 'Intel restriction', 'letter: met on a date'] } as const
const PRE_TRADE = ['pre-trade: concentration today', 'pre-trade: model above tolerance'] as const
const PELL_RULES = ['prospect: a holding moves in kind', 'prospect letter: a holding on her statement', 'prospect letter: a sale in parts', 'prospect letter: a sale in parts offered',
  'prospect letter: everything in kind', 'prospect letter: in kind against the model', 'prospect letter: prices at the close', "prospect letter: the fee on today's value", 'prospect letter: the low-basis position'] as const
const rebalanceNote = () => store().meetings.find((m) => m.eventId === 'evt-010')?.notesDraft?.find((l) => l.id === 'n-01')?.text

describe("the README path: no agent claim or letter line contradicts the ledger when it was made", () => {
  it('replays the story, checking after every step', () => {
    const { check, used, count } = checker()
    check('session start: the Brief', BRIEF_AT_START)

    const intel = store().messages.find((m) => m.kind === 'agent_finding' && m.threadId === 'th-brief' && m.agentId === 'harvest-scanner' && /Intel/.test(m.claim) && /can be sold at a loss today/.test(m.claim))
    if (!intel) throw new Error("The Brief's Intel harvest finding is missing")
    ok(carryFinding(ADRIAN, 'th-brief', intel.id, 'th-johnson-review'))
    ok(runAgent(ADRIAN, 'th-johnson-review', 'drift-monitor'))
    ok(runAgent(ADRIAN, 'th-johnson-review', 'pretrade-check'))
    check('the finding shared, the review thread measured', { claims: 8, rules: ['replacement held', 'concentration over today', 'illiquid holding', 'suitability: model against tolerance'] })

    const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
    check('v1', { claims: 3, rules: ['proposal counts working orders', ...PRE_TRADE] })
    ok(reviseProposal(ADRIAN, detail.id, [{ kind: 'harvest_only' }]))
    check('v2', { claims: 3, rules: ['proposal counts working orders', ...PRE_TRADE] })
    const v3 = ok(saveVersion(ADRIAN, detail.id, [{ kind: 'exclude', symbol: 'QAI' }])).detail.versions[2]
    if (!v3) throw new Error('v3 was saved')
    check('v3', { claims: 3, rules: PRE_TRADE })
    const { act } = ok(approveProposal(ADRIAN, detail.id, 3, v3.fingerprint, JOHNSON_REASON))
    ok(releaseOrders(MARK, detail.id, act.id, v3.fingerprint, 'Reviewed v3, its legs and its pre-trade check results.', { viaPresenter: { presenterId: ADRIAN } }))
    check('released and filled', { claims: 1, rules: ['fills report'] })

    remeasureBrief()
    check('the Brief after the fills', { claims: 20, rules: ['bought today', 'realized loss', 'replacement held', 'harvest: none without a wash', 'summary reads a standing finding'] })

    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    check('meeting prep', { claims: 7, rules: ['prep: filled', 'prep: wash-sale windows', 'held away named'] })
    heldDraftedFiled()
    check('the notes, filed', NOTES)
    expect(rebalanceNote()).toBe(REBALANCE_LINE.filled_this_morning)
    const recap = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    check('the recap, drafted', { claims: 16, letterLines: 16, rules: RECAP_SENT.rules })
    ok(sendToParty(ADRIAN, recap.id))
    check('the recap, sent to both', RECAP_SENT)

    ok(deliverDisclosure(ADRIAN, PELL, 'form_crs'))
    jumpToHerReply()
    standingTrue('Thu 26 Feb: the Brief, opened after the jump')
    ok(runAgent(ADRIAN, 'th-johnson-review', 'drift-monitor'))
    check('Thu 26 Feb: the review thread measured again', { claims: 23, rules: ['replacement held', 'harvest offered', 'summary reads a standing finding'] })
    ok(runAgent(ADRIAN, PELL_WORK_THREAD_ID, 'prospect-profile'))
    ok(runAgent(ADRIAN, PELL_WORK_THREAD_ID, 'transfer-in'))
    const pell = ok(createProspectProposal(ADRIAN, PELL)).detail
    const pellV2 = ok(reviseProspectProposal(ADRIAN, pell.id, [{ kind: 'stage_diversification', tranches: 2 }])).detail.versions[1]
    if (!pellV2) throw new Error('her v2 exists')
    ok(approveProspectProposal(ADRIAN, pell.id, 2, pellV2.fingerprint, 'Growth fits her answers.'))
    ok(sendProspectProposal(ADRIAN, pell.id))
    check("Thu 26 Feb: Dr. Pell's work and the letter she reads", { claims: 25, letterLines: 19, rules: PELL_RULES })
    ok(advanceProspect(ADRIAN, PELL, 'acceptance'))
    standingTrue('Mon 2 Mar: the Brief, opened after the jump')
    ok(runAgent(ADRIAN, 'th-johnson-review', 'pretrade-check'))
    ok(takeToTeamThread(ADRIAN, 'risk', 'acc-045'))
    check('Mon 2 Mar: the pre-trade check again, and the Patel row taken to a team thread', { claims: 21, rules: ['concentration over today', 'harvest offered', 'summary reads a standing finding'] })

    expect(count()).toBeGreaterThan(30)
    for (const rule of ['harvest offered', 'realized loss', 'bought today', 'replacement held', 'prep: filled', 'proposal counts working orders',
      'notes: the rebalance', "notes: Patricia's accounts", 'letter: the Intel window', "no trades in Patricia's accounts", 'fills report',
      'Intel restriction', 'letter: met today', 'held away named', 'illiquid holding', 'suitability: model against tolerance', 'harvest: none without a wash',
      'concentration over today', 'summary reads a standing finding', ...PRE_TRADE, ...PELL_RULES]) {
      expect(used, `the story never exercised "${rule}"`).toContain(rule)
    }
  })

  it('holds the review before the release: the notes read as a plan, and prep says nothing filled', () => {
    const { check } = checker()
    const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
    const v1 = detail.versions[0]
    if (!v1) throw new Error('v1 exists')
    ok(approveProposal(ADRIAN, detail.id, 1, v1.fingerprint, JOHNSON_REASON))
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    heldDraftedFiled()
    check('held before the release', { claims: 52, rules: ['prep: nothing filled', 'notes: the rebalance', 'today: awaiting release'] })
    expect(rebalanceNote()).toBe(REBALANCE_LINE.awaiting_release)
  })

  it('holds the review, then releases, then drafts: the notes read the rebalance as the meeting left it', () => {
    const { check } = checker()
    check('session start: the Brief', BRIEF_AT_START)
    const approved = approvedStoryV3()
    ok(holdMeeting(ADRIAN, 'evt-010'))
    release(approved)
    check('released after the meeting', { claims: 10, rules: ['fills report'] })
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    check('the notes, drafted after the release', NOTES)
    expect(rebalanceNote()).toBe(REBALANCE_LINE.awaiting_release)
  })

  it.each([
    ['Thu 26 Feb', () => jumpToHerReply()],
    ['Mon 2 Mar', () => { jumpToHerReply(); jumpToHerAcceptance() }],
  ])("holds the review after the release and the jump to %s: prep reads that day's fills, the notes the meeting day's", (day, jump) => {
    const { check } = checker()
    check('session start: the Brief', BRIEF_AT_START)
    release(approvedStoryV3())
    check('released on 25 Feb', { claims: 10, rules: ['fills report', 'proposal counts working orders'] })
    jump()
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    check(`${day}: meeting prep`, { claims: 7, rules: ['prep: nothing filled', 'prep: wash-sale windows'] })
    heldDraftedFiled()
    check(`${day}: the notes, filed`, NOTES)
    expect(rebalanceNote()).toBe(REBALANCE_LINE.filled_this_morning)
    ok(sendToParty(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
    check(`${day}: the recap, sent to both`, RECAP_SENT_LATER)
  })

  it("catches a Brief left standing after a jump: yesterday's \"bought today\" is untrue on Thu 26 Feb until the Brief re-measures", () => {
    release(approvedStoryV3())
    remeasureBrief()
    jumpToHerReply()
    const stale = byReading(standingClaims()).flatMap((g) => disagreements(g.claims, g.ledger).disagreeing)
    expect(stale.some((d) => d.startsWith('bought today · finding'))).toBe(true)
    standingTrue('Thu 26 Feb, the Brief re-measured')
  })

  it("checks a pre-trade warning about a working order against the ledger: Michael Martinez's working EFA buy", () => {
    const claims = runPretradeCheck({ asOf: MOCK_NOW_ISO, subject: { type: 'account', id: 'acc-015' } }).map((f, i): Claim => ({
      key: `pretrade-${i}`, source: 'finding', householdId: 'hh-004', day: '2026-02-25', agentId: 'pretrade-check', accountId: 'acc-015', text: f.claim, figures: f.figures,
    }))
    const overlap = claims.filter((c) => /already has a working order/.test(c.text))
    expect(overlap).toHaveLength(1)
    expect(disagreements(overlap, householdLedger('hh-004'))).toMatchObject({ unguarded: [], disagreeing: [], rulesUsed: new Set(['working order overlap']) })
    const canceled = { ...householdLedger('hh-004'), openOrders: [] }
    expect(disagreements(overlap, canceled).disagreeing).toEqual(['working order overlap · finding pretrade-1: no working order on EFA'])
  })

  it('catches a contradiction: a note that says the morning rebalanced when nothing filled', () => {
    const seen = new Set<string>()
    newClaims(seen)
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    const meeting = store().meetings[0]
    if (!meeting?.notesDraft) throw new Error('the notes are drafted')
    meeting.notesDraft = meeting.notesDraft.map((l) => (l.id === 'n-01' ? { ...l, text: "Reviewed this morning's rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes." } : l))
    const meetingEnd = meeting.heldAt?.end
    if (!meetingEnd) throw new Error('the meeting was held')
    expect(disagreements(newClaims(seen), householdLedgerAt('hh-001', meetingEnd)).disagreeing).toEqual([
      'notes: the rebalance · notes n-01: the notes say "Reviewed this morning\'s rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes."; the ledger says not_approved',
    ])
  })
})
