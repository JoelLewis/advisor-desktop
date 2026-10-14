import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const VIEWS = [
  '/reference/billing', '/reference/practice', '/reference/reconciliation', '/reference/risk', '/reference/risk/acc-002',
  '/reference/attribution/acc-002', '/reference/attribution/acc-002?period=3y', '/reference/models', '/reference/models/mod-005',
  '/reference/blotter', '/reference/blotter?status=filled&accountId=acc-002&since=2026-02-20&until=2026-02-25',
]
const PROBES = [...VIEWS, '/reference/risk/acc-999', '/reference/models/mod-999', '/reference/attribution/acc-002?period=forever', '/reference/blotter?status=bogus']

describe('the reference endpoints', () => {
  it('serve every view to each firm viewer', async () => {
    for (const viewer of ['user-001', 'user-002', 'user-003', 'cco-001']) {
      for (const path of VIEWS) expect((await call('GET', path, viewer)).status, `${viewer} ${path}`).toBe(200)
    }
    expect((await call('GET', '/reference/attribution/acc-002?period=3y', 'user-001')).body.period).toBe('3y')
    expect((await call('GET', '/reference/attribution/acc-002', 'user-001')).body.period).toBe('ytd')
  })

  it('answer an outsider 404 on every path, whatever the id or the filter, and nobody 401', async () => {
    for (const viewer of ['cli-001', 'prsp-011']) {
      for (const path of PROBES) {
        const r = await call('GET', path, viewer)
        expect(r.status, `${viewer} ${path}`).toBe(404)
        expect(JSON.stringify(r.body), `${viewer} ${path}`).not.toMatch(/Household|brk-|policy benchmark/)
      }
    }
    for (const path of VIEWS) expect((await call('GET', path, undefined)).status, path).toBe(401)
  })

  it('refuse what the views do not hold', async () => {
    expect((await call('GET', '/reference/risk/acc-999', 'user-001')).status).toBe(404)
    expect((await call('GET', '/reference/attribution/acc-999', 'user-001')).status).toBe(404)
    expect((await call('GET', '/reference/models/mod-999', 'user-001')).status).toBe(404)
    expect((await call('GET', '/reference/attribution/acc-002?period=inception', 'user-001')).body).toMatchObject({ code: 'BAD_PERIOD' })
    for (const query of ['status=bogus', 'since=yesterday', 'since=2026-02-25&until=2026-02-01']) {
      const r = await call('GET', `/reference/blotter?${query}`, 'user-001')
      expect([r.status, r.body.code], query).toEqual([400, 'BAD_FILTER'])
    }
  })

  it('cannot be edited: a write to a reference path is 405', async () => {
    expect((await call('POST', '/reference/billing', 'user-001', {})).status).toBe(405)
  })
})

describe('resolve_break over HTTP', () => {
  const resolve = async (viewer: string, overrides: Record<string, unknown> = {}) => {
    const { body } = await call('GET', '/reference/reconciliation', 'user-001')
    const fingerprint = body.breaks.find((b: { id: string }) => b.id === 'brk-002').fingerprint
    return call('POST', '/acts', viewer, { kind: 'resolve_break', breakId: 'brk-002', fingerprint, resolution: 'timing_difference', rationale: 'Sweep posted late.', ...overrides })
  }

  it('records once; the second answers 409 naming the first', async () => {
    const first = await resolve('user-002')
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({ kind: 'resolve_break', actorId: 'user-002' })
    expect(await resolve('user-001')).toMatchObject({ status: 409, body: { code: 'ALREADY_RESOLVED' } })
    expect((await call('GET', '/reference/reconciliation', 'user-001')).body.summary.openBreaks).toBe(0)
  })

  it('is 404 to outsiders before the body is read, 403 to the analyst, 400 to a malformed body', async () => {
    expect((await call('POST', '/acts', 'cli-001', { kind: 'resolve_break' })).status).toBe(404)
    expect((await call('POST', '/acts', 'prsp-011', { kind: 'resolve_break' })).status).toBe(404)
    expect(await resolve('user-003')).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
    expect((await resolve('user-001', { resolution: 'shrug' })).status).toBe(400)
    expect((await resolve('user-001', { breakId: undefined })).status).toBe(400)
    expect(store().acts).toHaveLength(0)
  })
})
