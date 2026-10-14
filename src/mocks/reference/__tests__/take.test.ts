import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { accounts } from '@/mocks/data/accounts'
import { households } from '@/mocks/data/households'
import { RECON_BREAKS } from '@/mocks/data/reconciliation'
import { MODEL_VERSIONS } from '@/mocks/data/model-governance'
import { REFERENCE_VIEWS, type ReferenceView } from '@/types/reference'
import { blotterView } from '../blotter'
import { attributionView } from '../attribution'
import { rowQuote } from '../quotes'
import { takeToTeamThread } from '../take'

const ADRIAN = 'user-001'
const take = (viewerId: string, view: ReferenceView, rowId: string) => {
  const r = takeToTeamThread(viewerId, view, rowId)
  if (!r.ok) throw new Error(r.message)
  return r
}

describe('take to team thread', () => {
  it("lands in the team thread about the row's subject, once", () => {
    const first = take(ADRIAN, 'risk', 'acc-002')
    expect(first).toMatchObject({ created: true, thread: { id: 'th-johnson-review' } })
    expect(first.message).toMatchObject({ kind: 'reference_row', threadId: 'th-johnson-review', takenBy: ADRIAN, view: 'risk', rowId: 'acc-002', subject: { type: 'account', id: 'acc-002' } })
    expect(first.message.claim).toBe("Robert Johnson Individual sits above Robert Johnson's risk tolerance.")
    const again = take(ADRIAN, 'risk', 'acc-002')
    expect(again).toMatchObject({ created: false, message: { id: first.message.id } })
    expect(store().messages.filter((m) => m.kind === 'reference_row')).toHaveLength(1)
  })

  it('a household row goes to the household thread', () => {
    expect(take(ADRIAN, 'billing', 'hh-001').thread.id).toBe('th-johnson-meeting')
  })

  it('opens a team thread when none is about the subject, and later rows join it', () => {
    const r = take(ADRIAN, 'risk', 'acc-045')
    expect(r.thread).toEqual({ id: 'th-ref-0001', title: 'Risk · Patel Digital Assets Account', visibility: 'internal', memberIds: ['user-001', 'user-002'], agentIds: [], subject: { type: 'account', id: 'acc-045' } })
    expect(take(ADRIAN, 'attribution', 'acc-045:ytd:digital_assets').thread.id).toBe('th-ref-0001')
  })

  it("someone outside the thread's members gets a thread they are in", () => {
    expect(take('cco-001', 'reconciliation', 'brk-002').thread).toMatchObject({ title: 'Reconciliation · brk-002 · Johnson Family Trust', memberIds: ['cco-001', 'user-001', 'user-002'] })
  })

  it('is 404 to outsiders and for a row the view does not have', () => {
    expect(takeToTeamThread('cli-001', 'risk', 'acc-002')).toMatchObject({ ok: false, status: 404 })
    expect(takeToTeamThread('prsp-011', 'billing', 'hh-001')).toMatchObject({ ok: false, status: 404 })
    expect(takeToTeamThread(ADRIAN, 'risk', 'acc-999')).toMatchObject({ ok: false, status: 404, code: 'NO_ROW' })
    expect(store().messages.filter((m) => m.kind === 'reference_row')).toHaveLength(0)
  })

  it('every primary row of every view quotes with no figure in its claim (record names keep their own digits)', () => {
    const rows: [ReferenceView, string][] = [
      ...households.map((h) => ['billing', h.id] as [ReferenceView, string]),
      ...households.map((h) => ['practice', h.id] as [ReferenceView, string]),
      ...RECON_BREAKS.map((b) => ['reconciliation', b.id] as [ReferenceView, string]),
      ...accounts.map((a) => ['risk', a.id] as [ReferenceView, string]),
      ...(attributionView(ADRIAN, 'acc-002', 'ytd')?.rows ?? []).map((r) => ['attribution', `acc-002:ytd:${r.assetClass}`] as [ReferenceView, string]),
      ...MODEL_DEFINITIONS.map((m) => ['models', m.id] as [ReferenceView, string]),
      ...MODEL_VERSIONS.map((v) => ['models', `${v.modelId}:v${v.version}`] as [ReferenceView, string]),
      ...(blotterView(ADRIAN, {})?.rows ?? []).map((r) => ['blotter', r.id] as [ReferenceView, string]),
    ]
    expect(new Set(rows.map(([view]) => view))).toEqual(new Set(REFERENCE_VIEWS))
    for (const [view, rowId] of rows) {
      const q = rowQuote(view, rowId)
      expect(q, `${view} ${rowId}`).toBeDefined()
      const claim = (q?.claim ?? '').replace(/\b529\b/g, '').replace(/UST-10Y|AAPLC185/g, '')
      expect(claim, `${view} ${rowId}`).not.toMatch(/\d/)
      for (const f of q?.figures ?? []) expect(f.source, `${view} ${rowId} ${f.label}`).not.toBe('')
    }
  })
})

describe('the take endpoint', () => {
  const post = (viewer: string, body: unknown) =>
    fetch('/api/workspace/reference/take', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Viewer': viewer }, body: JSON.stringify(body) })

  it('answers 201 then 200 with the same card, 400 to a bad body, 404 to outsiders', async () => {
    const first = await post(ADRIAN, { view: 'risk', rowId: 'acc-045' })
    expect(first.status).toBe(201)
    const result = await first.json()
    expect(result).toEqual({ threadId: 'th-ref-0001', threadTitle: 'Risk · Patel Digital Assets Account', messageId: expect.any(String), created: true })
    const second = await post(ADRIAN, { view: 'risk', rowId: 'acc-045' })
    expect(second.status).toBe(200)
    expect((await second.json()).messageId).toBe(result.messageId)
    expect((await post(ADRIAN, { view: 'tax', rowId: 'x' })).status).toBe(400)
    expect((await post(ADRIAN, { view: 'risk', rowId: 'acc-999' })).status).toBe(404)
    expect((await post('cli-001', { view: 'risk', rowId: 'acc-045' })).status).toBe(404)
  })
})
