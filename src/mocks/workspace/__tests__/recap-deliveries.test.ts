import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { sendToParty } from '../acts'
import { supervisionQueue } from '../supervision'
import { visibleThreads } from '../visibility'
import { archiveFor } from '../archive'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const PATRICIA = 'cli-002'

function recap() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  const fingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
  if (!fingerprint) throw new Error('the notes have a fingerprint')
  ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
  return ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
}

async function asPatricia(path: string) {
  const res = await fetch(`/api/workspace${path}`, { headers: { 'X-Viewer': PATRICIA } })
  const text = await res.text()
  return { status: res.status, body: text === '' ? null : (JSON.parse(text) as unknown) }
}

describe('Patricia, a client in her own right', () => {
  it('has her own conversation, and sees only it', () => {
    expect(visibleThreads(PATRICIA).map((t) => t.id)).toEqual(['th-patricia'])
    expect(store().threads.find((t) => t.id === 'th-patricia')).toMatchObject({ visibility: 'client', partyId: PATRICIA, subject: { type: 'client', id: PATRICIA } })
  })
})

describe('the recap goes to both spouses', () => {
  it('records a copy for Patricia, who attended and has her own conversation', () => {
    expect(recap().copies).toEqual([{ threadId: 'th-patricia', partyName: 'Patricia Johnson' }])
  })

  it('is one recorded act with two deliveries: the same letter in each conversation', () => {
    const draft = recap()
    const { act } = ok(sendToParty(ADRIAN, draft.id))
    expect(store().acts.filter((a) => a.kind === 'send_to_party')).toHaveLength(1)
    expect(act.summary).toBe('Message sent to Robert Johnson and Patricia Johnson')
    expect(act.deliveries?.map((d) => d.threadId)).toEqual(['th-robert', 'th-patricia'])
    for (const d of act.deliveries ?? []) {
      expect(store().messages.find((m) => m.id === d.messageId)).toMatchObject({ kind: 'text', threadId: d.threadId, body: draft.body })
      expect(store().messages.some((m) => m.kind === 'act' && m.threadId === d.threadId && m.actId === act.id), d.threadId).toBe(true)
    }
  })

  it("carries Patricia's own decision to her", () => {
    const { act } = ok(sendToParty(ADRIAN, recap().id))
    const hers = store().messages.find((m) => m.id === act.deliveries?.[1]?.messageId)
    expect(hers?.kind === 'text' ? hers.body : '').toContain("We won't trade in Patricia's accounts until her risk profile and models are reviewed.")
  })

  it('puts each delivery in front of compliance', () => {
    ok(sendToParty(ADRIAN, recap().id))
    expect(supervisionQueue('cco-001')?.correspondence.map((c) => c.title)).toEqual(['Message to Robert Johnson', 'Message to Patricia Johnson'])
  })

  it('shows Patricia the record of what reached her, numbered as hers, with nothing of the firm', async () => {
    ok(sendToParty(ADRIAN, recap().id))
    const acts = await asPatricia('/acts?threadId=th-patricia')
    expect(acts.status).toBe(200)
    expect(acts.body).toEqual([expect.objectContaining({ id: '1', kind: 'send_to_party', threadId: 'th-patricia' })])
    expect(JSON.stringify(acts.body)).not.toMatch(/deliveries|th-robert|REC-\d{4}|fingerprint/)
    const thread = await asPatricia('/threads/th-patricia')
    expect(JSON.stringify(thread.body)).toContain('What we decided:')
    expect((await asPatricia('/threads/th-robert')).status).toBe(404)
  })

  it('shows books and records one sent message per delivery, tied to the one act', () => {
    const { act } = ok(sendToParty(ADRIAN, recap().id))
    const archive = archiveFor(ADRIAN, {})
    const sent = (archive?.entries ?? []).flatMap((e) => (e.kind === 'sent_message' ? [e] : []))
    expect(sent.map((e) => [e.threadId, e.partyId, e.actId])).toEqual([['th-robert', 'cli-001', act.id], ['th-patricia', 'cli-002', act.id]])
    expect(sent.map((e) => e.id)).toEqual((act.deliveries ?? []).map((d) => d.messageId))
    expect((archive?.entries ?? []).filter((e) => e.kind === 'act' && e.act.kind === 'send_to_party')).toHaveLength(1)
    for (const [partyId, threadId] of [['cli-001', 'th-robert'], ['cli-002', 'th-patricia']] as const) {
      const own = archiveFor(ADRIAN, { partyId, kind: 'sent_message' })?.entries
      expect(own?.map((e) => e.threadId), partyId).toEqual([threadId])
    }
  })

  it('has no Archive for Patricia: it is firm only', () => {
    ok(sendToParty(ADRIAN, recap().id))
    expect(archiveFor(PATRICIA, {})).toBeUndefined()
  })
})
