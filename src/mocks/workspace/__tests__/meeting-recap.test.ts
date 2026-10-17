import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REVIEW_TRANSCRIPT } from '@/mocks/data/meeting-transcripts'
import { holdMeeting, meetingView, notesFingerprint, saveNotes } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { writeMeetingRecap } from '@/mocks/agents/meeting-recap'
import { draftsFor, reviseDraft } from '../letters'
import { sendToParty } from '../acts'
import { supervisionQueue } from '../supervision'
import { archiveFor } from '../archive'
import { approvedV1, ok, release } from './story-fixture'
import type { NoteLine } from '@/types/workspace-meeting'
import { latestIntelWindowEnd } from '../draft-staleness'
import { clientDate } from '@/kit/measure'

const ADRIAN = 'user-001'
const meeting = () => store().meetings[0]!
function heldAndDrafted() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
}
function file() {
  ok(fileMeetingRecord(ADRIAN, 'evt-010', meetingView(ADRIAN, 'evt-010')!.notesFingerprint!))
}
const edit = (id: string, text: string): NoteLine[] => meeting().notesDraft!.map((l) => (l.id === id ? { ...l, text } : l))
const robertsTexts = () => store().messages.filter((m) => m.threadId === 'th-robert' && m.kind === 'text')
const recapBody = () => {
  heldAndDrafted()
  file()
  return ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.body
}
/** The last day Robert's latest open Intel window covers, as the letter writes it. */
const lastWashDay = () => {
  const end = latestIntelWindowEnd('cli-001')
  if (end === undefined) throw new Error('Robert has no open Intel window')
  return clientDate(end)
}

describe('the recap', () => {
  it('is drafted by the Client Letter Agent from the filed record, tied to the filing', () => {
    heldAndDrafted()
    file()
    const { draft, created } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    expect(created).toBe(true)
    expect(draft).toMatchObject({
      clientThreadId: 'th-robert', authorId: ADRIAN, agentId: 'client-letter', figures: [],
      recordBasis: { eventId: 'evt-010', actId: 'REC-0001', fingerprint: meeting().filed!.fingerprint },
    })
    expect(draft.body.startsWith('Dear Robert and Patricia,\n\nThank you both for meeting with me today. Here is what we agreed.')).toBe(true)
    expect(draft.body.endsWith('If anything here is not as you remember it, please tell me.\n\nAdrian Hale\nLarkfield Advisory')).toBe(true)
  })

  it('carries every client request and decision as filed — in the wording filed for Robert where there is one — and nothing else', () => {
    heldAndDrafted()
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    const lines = meeting().filed!.lines
    for (const l of lines.filter((x) => x.section === 'client_requests' || x.section === 'decisions')) {
      expect(body, l.id).toContain(l.toClient?.clientId === 'cli-001' ? l.toClient.text : l.text)
    }
    for (const l of lines.filter((x) => x.toClient)) expect(body, l.id).not.toContain(l.text)
    for (const l of lines.filter((x) => x.section === 'discussion' || x.section === 'follow_ups')) expect(body, l.id).not.toContain(l.text)
    expect(body.indexOf('What you asked us:')).toBeLessThan(body.indexOf('What we decided:'))
    expect(body).toContain("You asked about moving your Vanguard 401(k) and Patricia's TIAA 403(b). We'll compare the options and come back to you.")
    expect(body).toContain('The amounts will be estimates; please check them with your tax professional.')
  })

  it('contains no transcript text, no internal note and no colleague', () => {
    heldAndDrafted()
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    for (const t of JOHNSON_REVIEW_TRANSCRIPT.filter((x) => x.text.length > 12)) expect(body, t.id).not.toContain(t.text)
    expect(body).not.toMatch(/Sarah|Mike|Mitchell|Chen|task/i)
  })

  it('asks plainly, with the date from the engine, above the Intel decision; the employer plan as firm policy', () => {
    heldAndDrafted()
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    expect(body).toContain("- Please don't buy Intel shares in any of your accounts through March 22, 2026.\n- The Intel restriction covers Patricia's accounts")
    expect(body).toContain('as firm policy, your held-away Vanguard 401(k), because the rule for employer plans is unsettled.')
  })

  it('after the morning release, the latest Intel window is the release sale\'s', () => {
    release(approvedV1())
    heldAndDrafted()
    file()
    expect(ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.body).toContain("Please don't buy Intel shares in any of your accounts through March 27, 2026.")
  })

  it("reads Adrian's edits, because it is written from the filed lines", () => {
    heldAndDrafted()
    ok(saveNotes(ADRIAN, 'evt-010', edit('n-10', 'We keep the legacy goal; options to protect it come to the next review.')))
    ok(saveNotes(ADRIAN, 'evt-010', edit('n-01', 'Reviewed the rebalance and the harvest in detail.')))
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    expect(body).toContain('We keep the legacy goal; options to protect it come to the next review.')
    expect(body).not.toContain('Reviewed the rebalance and the harvest in detail.')
  })

  it('speaks to Robert as "you" past the greeting; Patricia, who is not the addressee, stays Patricia', () => {
    heldAndDrafted()
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    const [greeting, ...rest] = body.split('\n\n')
    expect(greeting).toBe('Dear Robert and Patricia,')
    expect(rest.join('\n\n')).not.toMatch(/\bRobert\b/)
    expect(body).toContain("- The Intel restriction covers Patricia's accounts and the IRAs too")
    expect(body).toContain("- You'll contact the Vanguard plan administrator to correct the beneficiary, and we'll send you our beneficiary checklist.")
    expect(body).toContain("- No trades in Patricia's accounts until her risk profile and models are reviewed.")
  })

  it('files the client wording with the record, in the fingerprint; the firm lines stay as filed', () => {
    heldAndDrafted()
    const draft = meeting().notesDraft!
    file()
    const filed = meeting().filed!
    expect(filed.lines).toEqual(draft)
    expect(filed.lines.find((l) => l.id === 'n-09')).toMatchObject({
      text: expect.stringMatching(/^Robert will not buy Intel/), toClient: { clientId: 'cli-001', text: expect.stringMatching(/^The Intel restriction covers/) },
    })
    expect(filed.fingerprint).toBe(notesFingerprint(draft))
    const reworded = draft.map((l) => (l.id === 'n-09' ? { ...l, toClient: { clientId: 'cli-001', text: 'You will not buy Intel until the window closes.' } } : l))
    expect(notesFingerprint(reworded)).not.toBe(filed.fingerprint)
  })

  it('a rewritten line loses its client wording and is read as filed; untouched lines keep theirs', () => {
    heldAndDrafted()
    ok(saveNotes(ADRIAN, 'evt-010', edit('n-12', 'Robert will ask Vanguard to correct the beneficiary; we will send our checklist.')))
    file()
    const lines = meeting().filed!.lines
    expect(lines.find((l) => l.id === 'n-12')!.toClient).toBeUndefined()
    expect(lines.find((l) => l.id === 'n-09')!.toClient?.clientId).toBe('cli-001')
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    expect(body).toContain('- Robert will ask Vanguard to correct the beneficiary; we will send our checklist.')
    expect(body).toContain('- The Intel restriction covers')
  })

  it('takes new client wording named in an edit, only on a line the client reads, only for a client of the meeting', () => {
    heldAndDrafted()
    const worded = (id: string, clientId: string) => meeting().notesDraft!.map((l) => (l.id === id ? { ...l, toClient: { clientId, text: 'We keep your legacy goal and will bring the options to your next review.' } } : l))
    expect(saveNotes(ADRIAN, 'evt-010', worded('n-01', 'cli-001'))).toMatchObject({ status: 400, code: 'CLIENT_WORDING_ONLY_ON_CLIENT_LINE' })
    expect(saveNotes(ADRIAN, 'evt-010', worded('n-10', 'cli-003'))).toMatchObject({ status: 400, code: 'UNKNOWN_CLIENT' })
    ok(saveNotes(ADRIAN, 'evt-010', worded('n-10', 'cli-001')))
    file()
    expect(ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.body).toContain('- We keep your legacy goal and will bring the options to your next review.')
  })

  it('reads a line worded for another client as filed', () => {
    heldAndDrafted()
    file()
    const { body } = writeMeetingRecap({ addresseeId: 'cli-002', greetingNames: ['Patricia', 'Robert'], filing: meeting().filed!, signerName: 'Adrian Hale' })
    expect(body).toContain("- Robert will not buy Intel in any of his or Patricia's accounts")
    expect(body).not.toContain('The Intel restriction covers')
  })

  it('asking again returns the same draft', () => {
    heldAndDrafted()
    file()
    const first = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    const again = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    expect(again).toMatchObject({ created: false, draft: { id: first.id } })
    expect(store().drafts).toHaveLength(1)
  })

  it('waits for the filing; is drafted only in the client thread of a household member; never for a client viewer', () => {
    heldAndDrafted()
    expect(draftRecap(ADRIAN, 'th-robert', 'evt-010')).toMatchObject({ status: 409, code: 'NOT_FILED' })
    file()
    expect(draftRecap(ADRIAN, 'th-johnson-review', 'evt-010')).toMatchObject({ status: 400, code: 'NOT_CLIENT_THREAD' })
    expect(draftRecap(ADRIAN, 'th-robert', 'evt-999')).toMatchObject({ status: 404, code: 'NO_MEETING' })
    expect(draftRecap('user-003', 'th-robert', 'evt-010')).toMatchObject({ status: 404, code: 'NO_THREAD' })
    expect(draftRecap('cli-001', 'th-robert', 'evt-010')).toMatchObject({ status: 404, code: 'NO_THREAD' })
    expect(ok(draftRecap('user-002', 'th-robert', 'evt-010')).draft.authorId).toBe('user-002')
  })

  it("an edit keeps the recap's basis", () => {
    heldAndDrafted()
    file()
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    const revised = ok(reviseDraft(ADRIAN, 'th-robert', draft.id, `${draft.body}\n\nPS. See you in the spring.`)).draft
    expect(revised.recordBasis).toEqual(draft.recordBasis)
  })
})

describe('the recap reads like a person wrote it', () => {
  it('greets both spouses who attended, and thanks them both', () => {
    expect(recapBody()).toMatch(/^Dear Robert and Patricia,\n\nThank you both for meeting with me today\./)
  })
  it('greets and thanks one client who attended alone', () => {
    heldAndDrafted()
    file()
    const { body } = writeMeetingRecap({ addresseeId: 'cli-001', greetingNames: ['Robert'], filing: meeting().filed!, signerName: 'Adrian Hale' })
    expect(body).toMatch(/^Dear Robert,\n\nThank you for meeting with me today\./)
  })
  it('asks plainly, and promises in the first person', () => {
    const body = recapBody()
    expect(body).toContain(`- Please don't buy Intel shares in any of your accounts through ${lastWashDay()}.`)
    expect(body).toContain("- We'll model Roth conversion amounts for the years before your required distributions begin and share them with your CPA. The amounts will be estimates; please check them with your tax professional.")
    expect(body).toContain("- You asked about moving your Vanguard 401(k) and Patricia's TIAA 403(b). We'll compare the options and come back to you.")
    expect(body).not.toMatch(/You will not|comparison to follow|consult your tax professional|\buntil the wash-sale/)
  })
  it('puts the Intel date before the Intel line it governs', () => {
    const body = recapBody()
    expect(body.indexOf("Please don't buy Intel shares")).toBeLessThan(body.indexOf('The Intel restriction covers'))
  })
  it('still carries only decisions and requests: no transcript, no note, no colleague', () => {
    expect(recapBody()).not.toMatch(/Sarah Mitchell|Mike Chen|transcript|t-\d\d|n-\d\d/)
  })
})

describe('the Intel window sentence', () => {
  it('precedes the Intel decision wherever it moved, and ends the decisions when no decision mentions Intel', () => {
    heldAndDrafted()
    ok(saveNotes(ADRIAN, 'evt-010', edit('n-09', 'Robert will not buy the stock back in any account until the window closes.')))
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    expect(body).toContain("- The investment policy statement stays as signed; an ESG change would need a signed amendment.\n- Please don't buy Intel shares in any of your accounts through March 22, 2026.")
  })
})

describe('sending the recap', () => {
  it('is one new message in Robert\'s thread, recorded with the filing it came from', () => {
    heldAndDrafted()
    file()
    const before = robertsTexts().length
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    const { act } = ok(sendToParty(ADRIAN, draft.id))
    expect(act).toMatchObject({ kind: 'send_to_party', recordBasis: draft.recordBasis, editedBy: [] })
    expect(robertsTexts()).toHaveLength(before + 1)
    expect(robertsTexts()[before]).toMatchObject({ authorId: ADRIAN, body: draft.body })
  })

  it("reaches Mark's correspondence review and the Archive", () => {
    heldAndDrafted()
    file()
    const { act } = ok(sendToParty(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
    const item = supervisionQueue('cco-001')!.correspondence.find((c) => c.id === act.messageId)
    expect(item).toMatchObject({ kind: 'correspondence', partyId: 'cli-001', sendAct: { recordBasis: { actId: 'REC-0001' } } })
    expect(archiveFor('cco-001', { kind: 'sent_message' })!.entries.map((e) => e.id)).toContain(act.messageId)
  })

  it('refuses a recap whose Intel window moved after it was drafted, and a new request drafts a fresh one', () => {
    heldAndDrafted()
    file()
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    expect(draft.body).toContain('through March 22, 2026.')
    release(approvedV1())
    expect(draftsFor('th-robert').find((d) => d.id === draft.id)).toMatchObject({
      stale: true, staleReason: 'This recap states the Intel wash-sale window through March 22, 2026, but it now runs through March 27, 2026. Ask for a new recap.',
    })
    expect(sendToParty(ADRIAN, draft.id)).toEqual({
      ok: false, status: 409, code: 'STALE_DRAFT', message: 'This recap states the Intel wash-sale window through March 22, 2026, but it now runs through March 27, 2026. Ask for a new recap.',
    })
    const fresh = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    expect(fresh).toMatchObject({ created: true, draft: { recordBasis: { windowEnd: '2026-03-27' } } })
    expect(fresh.draft.body).toContain('through March 27, 2026.')
  })

  it('refuses a recap whose filing it no longer matches', () => {
    heldAndDrafted()
    file()
    store().drafts.push({
      id: 'draft-9001', clientThreadId: 'th-robert', authorId: ADRIAN, body: 'Dear Robert, an older recap.', createdAt: '2026-02-25T20:30:00.000Z',
      agentId: 'client-letter', recordBasis: { eventId: 'evt-010', actId: 'REC-0001', fingerprint: 'DEADBEEF' },
    })
    expect(draftsFor('th-robert').find((d) => d.id === 'draft-9001')?.stale).toBe(true)
    expect(sendToParty(ADRIAN, 'draft-9001')).toEqual({
      ok: false, status: 409, code: 'STALE_DRAFT', message: 'This recap was drafted from REC-0001, which no longer matches the filed record. Ask for a new recap.',
    })
    expect(robertsTexts().some((m) => m.kind === 'text' && m.body === 'Dear Robert, an older recap.')).toBe(false)
  })
})
