import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Draft, ThreadDetail } from '@/types/workspace'
import { nextAt, nextId, resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { canSeeThread, isExternalViewer, isFirmViewer, visibleThreads } from '../visibility'
import { meetingSummaries, visibleMeeting } from '../meetings'
import { clientView, householdView } from '../household-views'
import { supervisionQueue } from '../supervision'
import { archiveFor } from '../archive'
import { createProposal, readableProposals } from '../proposals'
import { visibleProposal } from '../proposal-acts'
import { actAsCco } from '../presenter'
import { draftingClientThread } from '../letters'
import { sendToParty } from '../acts'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { partyOf, partyOfThread } from '../party'
import { threadParty } from '@/workspace/people/thread-party'

const PELL = 'prsp-011'
const ROBERT = 'cli-001'
const ADRIAN = 'user-001'
const EXTERNAL = [PELL, ROBERT] as const
const thread = (id: string) => {
  const t = store().threads.find((x) => x.id === id)
  if (!t) throw new Error(`no thread ${id}`)
  return t
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}


describe('who is outside the firm', () => {
  it.each([[PELL, true], [ROBERT, true], [ADRIAN, false], ['cco-001', false], ['nobody', false]] as const)(
    'isExternalViewer(%s) is %s', (id, expected) => expect(isExternalViewer(id)).toBe(expected))
  it.each([[PELL, false], [ROBERT, false], [ADRIAN, true], ['user-003', true], ['nobody', false]] as const)(
    'isFirmViewer(%s) is %s', (id, expected) => expect(isFirmViewer(id)).toBe(expected))
  it('names each party by kind', () => {
    expect(partyOf(PELL)).toEqual({ id: PELL, kind: 'prospect', name: 'Dr. Amanda Pell' })
    expect(partyOf(ROBERT)).toEqual({ id: ROBERT, kind: 'client', name: 'Robert Johnson' })
    expect(partyOf('nobody')).toBeUndefined()
    expect(partyOfThread(thread('th-pell')).kind).toBe('prospect')
  })
  it('the UI and the engine agree on whose thread it is (subject type vs partyId)', () => {
    for (const id of ['th-pell', 'th-pell-work']) expect(threadParty(thread(id)), id).toBe('prospect')
    expect(threadParty(thread('th-robert'))).toBe(partyOfThread(thread('th-robert')).kind)
    expect(threadParty(thread('th-pell'))).toBe(partyOfThread(thread('th-pell')).kind)
  })
})

describe('each party sees only their own thread', () => {
  it("Dr. Pell sees her thread — not Robert's, not her internal sibling", () => {
    expect(visibleThreads(PELL).map((t) => t.id)).toEqual(['th-pell'])
    expect(canSeeThread(PELL, thread('th-robert'))).toBe(false)
    expect(canSeeThread(PELL, thread('th-pell-work'))).toBe(false)
  })
  it('Robert does not see hers', () => {
    expect(visibleThreads(ROBERT).map((t) => t.id)).toEqual(['th-robert'])
    expect(canSeeThread(ROBERT, thread('th-pell'))).toBe(false)
  })
  it('the firm members see both; compliance supervises both; Mike, not a member of hers, does not see it', () => {
    for (const id of ['th-pell', 'th-pell-work', 'th-robert']) expect(canSeeThread('cco-001', thread(id)), id).toBe(true)
    expect(canSeeThread(ADRIAN, thread('th-pell'))).toBe(true)
    expect(canSeeThread('user-003', thread('th-pell'))).toBe(false)
    expect(canSeeThread('user-003', thread('th-pell-work'))).toBe(true)
  })
})

describe('every firm gate answers an external viewer as if nothing were there', () => {
  it.each(EXTERNAL)('%s gets nothing from any firm surface', (viewer) => {
    expect(visibleMeeting(viewer, 'evt-010')).toBeUndefined()
    expect(meetingSummaries(viewer)).toBeUndefined()
    expect(householdView(viewer, 'hh-001')).toBeUndefined()
    expect(clientView(viewer, 'cli-001')).toBeUndefined()
    expect(supervisionQueue(viewer)).toBeUndefined()
    expect(archiveFor(viewer, {})).toBeUndefined()
    expect(readableProposals(viewer)).toBeUndefined()
    expect(readableProposals(viewer, viewer === PELL ? 'th-pell' : 'th-robert')).toBeUndefined()
    expect(createProposal(viewer, 'th-johnson-review', 'acc-002')).toMatchObject({ ok: false, status: 404 })
    expect(actAsCco(viewer, { kind: 'alert', id: 'comp-001' })).toMatchObject({ ok: false, status: 404 })
    expect(draftingClientThread(viewer, viewer === PELL ? 'th-pell' : 'th-robert')).toBeUndefined()
    expect(disposeAlert(viewer, 'comp-001', 'approve', 'X', 'Reviewed.')).toMatchObject({ ok: false, status: 404 })
  })
  it.each([[PELL, 'th-pell'], [ROBERT, 'th-robert']] as const)(
    '%s cannot send or review a real draft and a real sent message in their own thread: 404, not 403', (viewer, threadId) => {
      resetWorkspaceStore()
      const s = store()
      const addDraft = () => {
        const draft: Draft = { id: nextId('draft'), clientThreadId: threadId, authorId: ADRIAN, body: 'A note for you.', createdAt: nextAt() }
        s.drafts.push(draft)
        return draft.id
      }
      const sent = sendToParty(ADRIAN, addDraft())
      if (!sent.ok || !sent.act.messageId) throw new Error('The advisor could not send the setup message')
      expect(sendToParty(viewer, addDraft())).toMatchObject({ ok: false, status: 404, code: 'NO_DRAFT' })
      expect(reviewCorrespondence(viewer, sent.act.messageId, 'reviewed', sent.act.fingerprint, 'Reviewed.')).toMatchObject({ ok: false, status: 404, code: 'NO_MESSAGE' })
    })
  it('a proposal the firm drafted is invisible to both parties', () => {
    const r = createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    if (!r.ok) throw new Error(r.message)
    for (const viewer of EXTERNAL) expect(visibleProposal(viewer, r.detail.id)).toBeUndefined()
    expect(visibleProposal(ADRIAN, r.detail.id)).toBeDefined()
  })
})

describe("an outsider's thread names only them", () => {
  const threadAs = async (id: string, viewer: string) => {
    const res = await fetch(`/api/workspace/threads/${id}`, { headers: { 'X-Viewer': viewer } })
    if (res.status !== 200) throw new Error(`GET ${id} as ${viewer} answered ${res.status}`)
    return (await res.json()) as ThreadDetail
  }
  it.each([['th-robert', ROBERT, 'Robert Johnson'], ['th-pell', PELL, 'Dr. Amanda Pell']] as const)(
    'GET %s as %s serves their own name as its audience', async (id, viewer, name) => {
      expect((await threadAs(id, viewer)).audience).toEqual({ kind: 'party', name })
    })
})

describe('the audit: one predicate', () => {
  it('no source outside src/lib/external-party.ts compares a role to client or prospect', () => {
    for (const file of sourceFiles('src')) {
      if (file.endsWith(join('lib', 'external-party.ts'))) continue
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/role\s*[!=]==\s*['"`](client|prospect)['"`]|['"`](client|prospect)['"`]\s*[!=]==\s*[\w.?]*role\b|['"`](client|prospect)['"`][^\n]*\.includes\([\w.?]*role\b/)
    }
  })
  it('no source reads a thread\'s clientId: external threads name their party', () => {
    for (const file of sourceFiles('src')) expect(readFileSync(file, 'utf8'), file).not.toMatch(/\b(thread|t|sent\.thread)\.clientId\b|isClientViewer/)
  })
})
