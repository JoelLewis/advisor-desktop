import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import { householdLedger } from '@/mocks/workspace/household-ledger'
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
import { createProspectProposal } from '@/mocks/workspace/prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '@/mocks/workspace/prospect-acts'
import { deliverDisclosure } from '@/mocks/workspace/disclosures'
import { approvedStoryV3, ok, release } from '@/mocks/workspace/__tests__/story-fixture'
import { disagreements, newClaims } from './ledger-claims'

const ADRIAN = 'user-001'
const MARK = 'cco-001'
const PELL = 'prsp-011'

/** What a step must have given the guard to read, so that it never passes on nothing: claims, client-letter lines, and the rules they met. */
type Expected = { claims: number; letterLines?: number; rules: readonly string[] }

/**
 * Checks every claim made since the last check against the ledger as it stands now; the notes, which record the
 * meeting's own day, against the ledger read for that day. Returns the rules it used.
 */
function checker() {
  const seen = new Set<string>()
  const used = new Set<string>()
  let checked = 0
  const check = (step: string, expected: Expected) => {
    const claims = newClaims(seen)
    checked += claims.length
    const usedHere = new Set<string>()
    for (const day of new Set(claims.map((c) => c.day))) {
      const { unguarded, disagreeing, rulesUsed } = disagreements(claims.filter((c) => c.day === day), householdLedger('hh-001', day))
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

const BRIEF_AT_START = { claims: 9, rules: ['harvest offered', 'realized loss', 'replacement held'] } as const
const NOTES = { claims: 23, rules: ['notes: the rebalance', "notes: Patricia's accounts"] } as const
const RECAP_SENT = { claims: 42, letterLines: 42, rules: ['letter: the Intel window', "letter: no trades in Patricia's accounts"] } as const
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
    check('the finding shared, the review thread measured', { claims: 7, rules: ['replacement held'] })

    const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
    check('v1', { claims: 1, rules: ['proposal counts working orders'] })
    ok(reviseProposal(ADRIAN, detail.id, [{ kind: 'harvest_only' }]))
    check('v2', { claims: 1, rules: ['proposal counts working orders'] })
    const v3 = ok(saveVersion(ADRIAN, detail.id, [{ kind: 'exclude', symbol: 'QAI' }])).detail.versions[2]
    if (!v3) throw new Error('v3 was saved')
    check('v3', { claims: 1, rules: [] })
    const { act } = ok(approveProposal(ADRIAN, detail.id, 3, v3.fingerprint, JOHNSON_REASON))
    ok(releaseOrders(MARK, detail.id, act.id, v3.fingerprint, 'Reviewed v3, its legs and its pre-trade check results.', { viaPresenter: { presenterId: ADRIAN } }))
    check('released and filled', { claims: 1, rules: ['fills report'] })

    remeasureBrief()
    check('the Brief after the fills', { claims: 10, rules: ['bought today', 'realized loss', 'replacement held'] })

    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    check('meeting prep', { claims: 7, rules: ['prep: filled', 'prep: wash-sale windows'] })
    heldDraftedFiled()
    check('the notes, filed', NOTES)
    expect(rebalanceNote()).toBe(REBALANCE_LINE.filled)
    const recap = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    check('the recap, drafted', { claims: 21, letterLines: 21, rules: RECAP_SENT.rules })
    ok(sendToParty(ADRIAN, recap.id))
    check('the recap, sent to both', RECAP_SENT)

    jumpToHerReply()
    remeasureBrief()
    ok(runAgent(ADRIAN, 'th-johnson-review', 'drift-monitor'))
    check('Thu 26 Feb: the review thread measured again', { claims: 5, rules: ['replacement held'] })
    jumpToHerAcceptance()
    remeasureBrief()
    ok(runAgent(ADRIAN, 'th-johnson-review', 'pretrade-check'))
    check('Mon 2 Mar: the pre-trade check again', { claims: 2, rules: [] })

    expect(count()).toBeGreaterThan(30)
    for (const rule of ['harvest offered', 'realized loss', 'bought today', 'replacement held', 'prep: filled', 'proposal counts working orders',
      'notes: the rebalance', "notes: Patricia's accounts", 'letter: the Intel window', "letter: no trades in Patricia's accounts", 'fills report']) {
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
    check('held before the release', { claims: 40, rules: ['prep: nothing filled', 'notes: the rebalance'] })
    expect(rebalanceNote()).toBe(REBALANCE_LINE.awaiting_release)
  })

  it.each([
    ['Thu 26 Feb', () => jumpToHerReply()],
    ['Mon 2 Mar', () => { jumpToHerReply(); jumpToHerAcceptance() }],
  ])("holds the review after the release and the jump to %s: prep reads that day's fills, the notes the meeting day's", (day, jump) => {
    const { check } = checker()
    check('session start: the Brief', BRIEF_AT_START)
    release(approvedStoryV3())
    check('released on 25 Feb', { claims: 4, rules: ['fills report', 'proposal counts working orders'] })
    jump()
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    check(`${day}: meeting prep`, { claims: 7, rules: ['prep: nothing filled', 'prep: wash-sale windows'] })
    heldDraftedFiled()
    check(`${day}: the notes, filed`, NOTES)
    expect(rebalanceNote()).toBe(REBALANCE_LINE.filled)
    ok(sendToParty(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
    check(`${day}: the recap, sent to both`, RECAP_SENT)
  })

  it('catches a contradiction: a note that says the morning rebalanced when nothing filled', () => {
    const seen = new Set<string>()
    newClaims(seen)
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    const meeting = store().meetings[0]
    if (!meeting?.notesDraft) throw new Error('the notes are drafted')
    meeting.notesDraft = meeting.notesDraft.map((l) => (l.id === 'n-01' ? { ...l, text: "Reviewed this morning's rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes." } : l))
    expect(disagreements(newClaims(seen), householdLedger('hh-001')).disagreeing).toEqual([
      'notes: the rebalance · notes n-01: the notes say "Reviewed this morning\'s rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes."; the ledger says not_approved',
    ])
  })
})
