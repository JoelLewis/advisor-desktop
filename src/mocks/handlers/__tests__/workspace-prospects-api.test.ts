import { describe, it, expect } from 'vitest'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const ADRIAN = 'user-001'
const PELL = 'prsp-011'

async function throughTheSend() {
  expect((await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee after the introduction.' })).status).toBe(201)
  expect((await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })).status).toBe(201)
  const { body: proposal } = await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})
  const v1 = proposal.versions[0]
  expect((await call('POST', '/acts', ADRIAN, { kind: 'approve_proposal', proposalId: proposal.id, version: 1, fingerprint: v1.fingerprint, rationale: 'Growth fits her answers.' })).status).toBe(201)
  expect((await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: PELL, document: 'form_crs' })).status).toBe(201)
  const sent = await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', proposalId: proposal.id })
  expect(sent.status).toBe(201)
  return { proposal, send: sent.body }
}

describe('the prospect read model', () => {
  it('serves the firm her record with its readings; she, Robert and nobody get 404 or 401', async () => {
    const { status, body } = await call('GET', '/prospects/prsp-011', ADRIAN)
    expect(status).toBe(200)
    expect(body).toMatchObject({ id: PELL, stage: 'contact', referrerName: 'James Thompson', proposals: [], formCrsDelivered: false, deliverable: ['form_crs', 'adv_2a'],
      nextJump: { to: 'reply', at: '2026-02-26T14:10:00.000Z', blockedReason: 'Record the coffee first; her reply follows it.' } })
    expect((await call('GET', '/prospects', ADRIAN)).body).toEqual([{ id: PELL, name: 'Dr. Amanda Pell', stage: 'contact', threadId: 'th-pell', internalThreadId: 'th-pell-work' }])
    for (const viewer of [PELL, 'cli-001']) {
      for (const path of ['/prospects', '/prospects/prsp-011', '/prospects/prsp-011/proposals']) expect((await call('GET', path, viewer)).status, `${viewer} ${path}`).toBe(404)
    }
    expect((await call('GET', '/prospects/prsp-011', undefined)).status).toBe(401)
    expect((await call('GET', '/prospects/prsp-999', ADRIAN)).status).toBe(404)
  })

  it('after her reply the firm reads her profile and her transfer', async () => {
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })
    const { body } = await call('GET', '/prospects/prsp-011', 'cco-001')
    expect(body.profile).toMatchObject({ score: 66, modelName: 'Growth' })
    expect(body.transfer).toMatchObject({ transferValue: 2_100_000, totalAssets: 3_000_000 })
    expect(body.steps.map((s: { viaPresenter: { path: string } }) => s.viaPresenter.path)).toEqual(['scripted', 'scripted'])
  })
})

describe('her steps over HTTP', () => {
  it('she reads and takes her own steps; the firm is told they are hers; Robert gets 404', async () => {
    expect((await call('GET', '/prospects/prsp-011/steps', PELL)).body).toEqual({ questionnaire: 'unavailable', statements: 'unavailable', acceptance: 'unavailable' })
    expect((await call('GET', '/prospects/prsp-011/steps', 'cli-001')).status).toBe(404)
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    const answered = await call('POST', '/prospects/prsp-011/questionnaire', PELL, {})
    expect(answered).toMatchObject({ status: 201, body: { steps: { questionnaire: 'done', statements: 'open' } } })
    expect(await call('POST', '/prospects/prsp-011/statements', ADRIAN, {})).toMatchObject({ status: 403, body: { code: 'NOT_HER_STEP' } })
    expect((await call('POST', '/prospects/prsp-011/statements', 'cli-001', {})).status).toBe(404)
    expect(await call('POST', '/prospects/prsp-011/questionnaire', PELL, { answers: 'all of them' })).toMatchObject({ status: 400 })
  })

  it('the presenter shortcut and the jumps are the presenter\'s; bodies are read only after the viewer is admitted', async () => {
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    expect(await call('POST', '/presenter/act-as-prospect', ADRIAN, { prospectId: PELL, step: 'questionnaire' })).toMatchObject({ status: 201, body: { steps: { questionnaire: 'done' } } })
    expect(await call('POST', '/presenter/act-as-prospect', 'user-002', { prospectId: PELL, step: 'statements' })).toMatchObject({ status: 403 })
    expect((await call('POST', '/presenter/act-as-prospect', PELL, { prospectId: PELL, step: 'nonsense' })).status).toBe(404)
    expect(await call('POST', '/presenter/act-as-prospect', ADRIAN, { prospectId: PELL, step: 'nonsense' })).toMatchObject({ status: 400 })
    expect(await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'tomorrow' })).toMatchObject({ status: 400 })
    expect((await call('POST', '/prospects/prsp-011/advance', 'cli-001', { to: 'tomorrow' })).status).toBe(404)
  })
})

describe('prospect acts over HTTP', () => {
  it('delivers, approves with a rationale, sends; refuses what the engine refuses', async () => {
    expect(await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: PELL, document: 'adv_9z' })).toMatchObject({ status: 400 })
    expect((await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: 'prsp-999', document: 'form_crs' })).status).toBe(404)
    const { proposal, send } = await throughTheSend()
    expect(send).toMatchObject({ kind: 'send_to_party', delivers: ['adv_2a'], basis: { proposalId: proposal.id, version: 1 } })
    expect(await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', proposalId: proposal.id })).toMatchObject({ status: 409, body: { code: 'ALREADY_SENT' } })
    expect(await call('POST', '/acts', ADRIAN, { kind: 'send_to_party' })).toMatchObject({ status: 400 })
  })

  it('her acts list carries only what reached her, stripped of the firm\'s provenance', async () => {
    await throughTheSend()
    expect((await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'acceptance' })).status).toBe(201)
    const { body } = await call('GET', '/acts?threadId=th-pell', PELL)
    expect(body.map((a: { kind: string }) => a.kind)).toEqual(['deliver_disclosure', 'send_to_party', 'accept_proposal'])
    for (const act of body) for (const key of ['subject', 'basis', 'bestInterest', 'viaPresenter', 'rationale', 'editedBy', 'messageId']) expect(act, key).not.toHaveProperty(key)
    const firm = await call('GET', '/acts?threadId=th-pell-work', ADRIAN)
    expect(firm.body[0]).toHaveProperty('bestInterest')
    expect((await call('GET', '/acts?threadId=th-pell-work', PELL)).status).toBe(404)
  })

  it('her own step responses carry none of the firm\'s provenance', async () => {
    const FIRM_ONLY = ['subject', 'basis', 'recordBasis', 'bestInterest', 'viaPresenter', 'rationale', 'editedBy', 'messageId']
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    const answered = await call('POST', '/prospects/prsp-011/questionnaire', PELL, {})
    const statements = await call('POST', '/prospects/prsp-011/statements', PELL, {})
    const { body: proposal } = await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})
    await call('POST', '/acts', ADRIAN, { kind: 'approve_proposal', proposalId: proposal.id, version: 1, fingerprint: proposal.versions[0].fingerprint, rationale: 'Growth fits her answers.' })
    await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: PELL, document: 'form_crs' })
    expect((await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', proposalId: proposal.id })).status).toBe(201)
    const accepted = await call('POST', '/prospects/prsp-011/accept', PELL, { version: 1 })
    expect(accepted).toMatchObject({ status: 201, body: { act: { kind: 'accept_proposal' } } })
    for (const [step, res] of [['questionnaire', answered], ['statements', statements], ['accept', accepted]] as const) {
      expect(res.status, step).toBe(201)
      if (res.body.act) for (const key of FIRM_ONLY) expect(res.body.act, `${step} ${key}`).not.toHaveProperty(key)
    }
    const firmCopy = (await call('GET', '/acts?threadId=th-pell', ADRIAN)).body.find((a: { kind: string }) => a.kind === 'accept_proposal')
    expect(firmCopy).toMatchObject({ subject: { id: proposal.id } })
    expect(firmCopy).toHaveProperty('viaPresenter')
  })

  it('proposals over HTTP: list, revise, preview; nothing is edited or deleted', async () => {
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })
    const { body: created } = await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})
    expect((await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})).status).toBe(200)
    expect(await call('POST', `/prospects/prsp-011/proposals/${created.id}/revise`, ADRIAN, { constraints: [{ kind: 'stage_diversification', tranches: 5 }] })).toMatchObject({ status: 400 })
    expect((await call('POST', `/prospects/prsp-011/proposals/${created.id}/preview`, ADRIAN, { constraints: [{ kind: 'stage_diversification', tranches: 2 }] })).body.tranches).toHaveLength(2)
    expect(await call('POST', `/prospects/prsp-011/proposals/${created.id}/revise`, ADRIAN, { constraints: [{ kind: 'stage_diversification', tranches: 2 }] })).toMatchObject({ status: 201 })
    expect((await call('GET', '/prospects/prsp-011/proposals', ADRIAN)).body[0].versions).toHaveLength(2)
    expect((await call('POST', `/prospects/prsp-011/proposals/${created.id}/revise`, PELL, { constraints: [] })).status).toBe(404)
    for (const method of ['PUT', 'PATCH', 'DELETE']) expect((await call(method, '/prospects/prsp-011', ADRIAN, {})).status, method).toBe(405)
  })
})
