import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { store } from '@/mocks/data/workspace-store'
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
    expect(sendToParty(viewer, 'draft-0001')).toMatchObject({ ok: false, status: 404 })
    expect(disposeAlert(viewer, 'comp-001', 'approve', 'X', 'Reviewed.')).toMatchObject({ ok: false, status: 404 })
    expect(reviewCorrespondence(viewer, 'msg-0001', 'reviewed', 'X', 'Reviewed.')).toMatchObject({ ok: false, status: 404 })
  })
  it('a proposal the firm drafted is invisible to both parties', () => {
    const r = createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    if (!r.ok) throw new Error(r.message)
    for (const viewer of EXTERNAL) expect(visibleProposal(viewer, r.detail.id)).toBeUndefined()
    expect(visibleProposal(ADRIAN, r.detail.id)).toBeDefined()
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
