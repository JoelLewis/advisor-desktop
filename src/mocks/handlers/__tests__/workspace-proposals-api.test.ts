import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown, raw?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, {
    method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const ask = () => call('POST', '/proposals', 'user-001', { threadId: 'th-johnson-review', accountId: 'acc-002' })

async function approvedLetter() {
  const { body: detail } = await ask()
  await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: detail.versions[0].fingerprint, suitability: JOHNSON_REASON })
  return (await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })).body
}

describe('proposal endpoints', () => {
  it('asks the Proposal Agent once: 201, then 200 with the same proposal', async () => {
    const first = await ask()
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({ id: 'prop-0001', approval: { kind: 'unapproved', latestVersion: 1 }, staged: [] })
    const second = await ask()
    expect(second.status).toBe(200)
    expect(second.body.id).toBe('prop-0001')
  })

  it('drafts proposals only in team threads', async () => {
    expect(await call('POST', '/proposals', 'user-001', { threadId: 'th-brief', accountId: 'acc-002' })).toMatchObject({ status: 400, body: { code: 'NOT_A_TEAM_THREAD' } })
    expect(await call('POST', '/proposals', 'user-001', { threadId: 'th-robert', accountId: 'acc-002' })).toMatchObject({ status: 400, body: { code: 'CLIENT_THREAD' } })
    expect(store().proposals).toHaveLength(0)
  })

  it('lists and reads proposals for firm viewers', async () => {
    await ask()
    expect((await call('GET', '/proposals?threadId=th-johnson-review', 'cco-001')).body.map((p: { id: string }) => p.id)).toEqual(['prop-0001'])
    expect((await call('GET', '/proposals', 'user-003')).body).toHaveLength(1)
    expect((await call('GET', '/proposals/prop-0001', 'user-002')).status).toBe(200)
    expect((await call('GET', '/proposals/prop-9999', 'user-001')).status).toBe(404)
  })

  it('a client gets 404 from every proposal and letter endpoint, and no PUT/PATCH/DELETE exists', async () => {
    const letter = await approvedLetter()
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.threadId === 'th-brief')!
    for (const [method, path, body] of [
      ['GET', '/proposals', undefined], ['GET', '/proposals?threadId=th-johnson-review', undefined], ['GET', '/proposals?threadId=th-robert', undefined],
      ['GET', '/proposals/prop-0001', undefined],
      ['POST', '/proposals', { threadId: 'th-johnson-review', accountId: 'acc-002' }], ['POST', '/proposals', { threadId: 'th-robert', accountId: 'acc-002' }],
      ['POST', '/proposals', {}],
      ['POST', '/proposals/prop-0001/revise', { constraints: [] }], ['POST', '/proposals/prop-0001/revise', { constraints: 'all' }],
      ['POST', '/proposals/prop-0001/versions', { edits: [] }], ['POST', '/proposals/prop-0001/preview', { edits: [] }],
      ['GET', '/threads/th-robert/drafts', undefined],
      ['POST', '/threads/th-robert/drafts/letter', { proposalId: 'prop-0001' }], ['POST', '/threads/th-robert/drafts/letter', {}],
      ['POST', `/threads/th-robert/drafts/${letter.id}/revisions`, { body: 'Edited.' }], ['POST', `/threads/th-robert/drafts/${letter.id}/revisions`, {}],
      ['POST', '/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X' }],
      ['POST', '/acts', { kind: 'approve_proposal', proposalId: 'prop-0001' }],
      ['POST', '/acts', { kind: 'withdraw_approval', proposalId: 'prop-0001' }],
      ['POST', '/acts', { kind: 'send_to_party', draftId: letter.id }],
      ['POST', `/threads/th-brief/findings/${finding.id}/carry`, { toThreadId: 'th-johnson-review' }],
      ['POST', `/threads/th-brief/findings/${finding.id}/carry`, {}],
    ] as const) {
      expect((await call(method, path, 'cli-001', body)).status, `${method} ${path} ${JSON.stringify(body)}`).toBe(404)
    }
    for (const method of ['PUT', 'PATCH', 'DELETE']) expect((await call(method, '/proposals/prop-0001', 'user-001')).status).toBe(405)
  })

  it('requires a known viewer on every new endpoint', async () => {
    for (const [method, path] of [
      ['GET', '/proposals'], ['GET', '/proposals/prop-0001'], ['POST', '/proposals'], ['POST', '/proposals/prop-0001/revise'],
      ['POST', '/proposals/prop-0001/versions'], ['POST', '/proposals/prop-0001/preview'], ['POST', '/threads/th-robert/drafts/letter'],
      ['POST', '/threads/th-robert/drafts/draft-0001/revisions'], ['POST', '/threads/th-brief/findings/msg-0001/carry'],
    ] as const) {
      const body = method === 'POST' ? {} : undefined
      expect((await call(method, path, undefined, body)).status, `${method} ${path}`).toBe(401)
      expect((await call(method, path, 'nobody', body)).status, `${method} ${path}`).toBe(401)
    }
  })

  it('answers malformed bodies with 400 BAD_REQUEST', async () => {
    await ask()
    const letter = await approvedLetter()
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.threadId === 'th-brief')!
    for (const [path, body] of [
      ['/proposals', { threadId: 'th-johnson-review' }], ['/proposals', { threadId: 7, accountId: 'acc-002' }],
      ['/proposals/prop-0001/revise', { constraints: 'all' }], ['/proposals/prop-0001/revise', { constraints: [{ kind: 'everything' }] }],
      ['/proposals/prop-0001/versions', {}], ['/proposals/prop-0001/preview', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: '6000' }] }],
      ['/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: '1', fingerprint: 'X' }],
      ['/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X', suitability: { reason: 'it_felt_right' } }],
      ['/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X', suitability: 'ips_permits_growth' }],
      ['/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X', suitability: { reason: 'ips_permits_growth', note: 4 } }],
      ['/acts', { kind: 'withdraw_approval' }], ['/acts', { kind: 3 }],
      ['/threads/th-robert/drafts/letter', {}], ['/threads/th-robert/drafts/letter', { proposalId: ['prop-0001'] }],
      [`/threads/th-robert/drafts/${letter.id}/revisions`, { body: 12 }],
      [`/threads/th-brief/findings/${finding.id}/carry`, { toThreadId: '' }],
    ] as const) {
      expect(await call('POST', path, 'user-001', body), `${path} ${JSON.stringify(body)}`).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    }
    for (const path of ['/proposals', '/proposals/prop-0001/revise', '/acts', '/threads/th-robert/drafts/letter']) {
      expect(await call('POST', path, 'user-001', undefined, '[not json'), path).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    }
  })

  it('revises, saves a version, previews without saving, and validates bodies', async () => {
    await ask()
    expect((await call('POST', '/proposals/prop-0001/revise', 'user-001', { constraints: [{ kind: 'harvest_only' }] })).status).toBe(201)
    expect((await call('POST', '/proposals/prop-0001/revise', 'user-001', { constraints: 'all' })).status).toBe(400)
    const preview = await call('POST', '/proposals/prop-0001/preview', 'user-001', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }] })
    expect(preview.status).toBe(200)
    expect(preview.body.fingerprint).toMatch(/^[0-9A-F]{8}$/)
    expect(store().proposals[0]!.versions).toHaveLength(2)
    const bad = await call('POST', '/proposals/prop-0001/preview', 'user-001', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: 0 }] })
    expect(bad).toMatchObject({ status: 400, body: { code: 'BAD_QUANTITY' } })
    const saved = await call('POST', '/proposals/prop-0001/versions', 'user-001', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }] })
    expect(saved.status).toBe(201)
    expect(saved.body.versions.map((v: { n: number }) => v.n)).toEqual([1, 2, 3])
  })

  it('approves through the acts endpoint, puts the orders pending compliance release, and withdraws', async () => {
    const { body: detail } = await ask()
    const fp = detail.versions[0].fingerprint
    expect(await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: fp }))
      .toMatchObject({ status: 409, body: { code: 'REASON_REQUIRED' } })
    const approved = await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: fp, suitability: JOHNSON_REASON })
    expect(approved).toMatchObject({ status: 201, body: { id: 'REC-0001', kind: 'approve_proposal', version: 1, suitability: { reason: 'accounts_within_tolerance', clientName: 'Robert Johnson' } } })
    expect((await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: fp, suitability: JOHNSON_REASON })).status).toBe(409)
    expect((await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: '1', fingerprint: fp })).status).toBe(400)
    const read = (await call('GET', '/proposals/prop-0001', 'cco-001')).body
    expect(read.approval).toMatchObject({ kind: 'approved', version: 1 })
    expect(read.staged.length).toBeGreaterThan(0)
    expect(read.staged.every((o: { status: string }) => o.status === 'pending_compliance')).toBe(true)
    expect((await call('GET', '/acts?threadId=th-johnson-review', 'cco-001')).body.map((a: { id: string }) => a.id)).toEqual(['REC-0001'])
    expect((await call('POST', '/acts', 'user-001', { kind: 'withdraw_approval', proposalId: 'prop-0001' })).status).toBe(201)
    expect((await call('GET', '/proposals/prop-0001', 'user-001')).body.approval.kind).toBe('unapproved')
  })

  it('drafts the letter, serves staleness, revises a draft, and refuses a stale send', async () => {
    const { body: detail } = await ask()
    await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: detail.versions[0].fingerprint , suitability: JOHNSON_REASON })
    const letter = await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })
    expect(letter).toMatchObject({ status: 201, body: { agentId: 'client-letter', basis: { version: 1 } } })
    expect((await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })).status).toBe(200)
    const edited = await call('POST', `/threads/th-robert/drafts/${letter.body.id}/revisions`, 'user-001', { body: 'Edited letter.' })
    expect(edited).toMatchObject({ status: 201, body: { supersedes: letter.body.id } })
    expect((await call('GET', '/threads/th-robert/drafts', 'user-001')).body).toEqual([expect.objectContaining({ id: edited.body.id, stale: false })])
    const v2 = await call('POST', '/proposals/prop-0001/revise', 'user-001', { constraints: [{ kind: 'harvest_only' }] })
    await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 2, fingerprint: v2.body.versions[1].fingerprint , suitability: JOHNSON_REASON })
    expect((await call('GET', '/threads/th-robert/drafts', 'user-001')).body[0].stale).toBe(true)
    expect((await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: edited.body.id })).body.code).toBe('STALE_DRAFT')
  })

  it('carries a Brief finding once', async () => {
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.threadId === 'th-brief')!
    const path = `/threads/th-brief/findings/${finding.id}/carry`
    expect((await call('POST', path, 'user-001', { toThreadId: 'th-johnson-review' })).status).toBe(201)
    expect((await call('POST', path, 'user-001', { toThreadId: 'th-johnson-review' })).status).toBe(200)
    expect((await call('POST', path, 'user-001', {})).status).toBe(400)
    expect((await call('POST', path, 'cli-001', { toThreadId: 'th-johnson-review' })).status).toBe(404)
  })
})
