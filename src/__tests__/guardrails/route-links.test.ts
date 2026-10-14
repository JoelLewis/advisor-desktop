import { describe, it, expect } from 'vitest'
import { SEED_MESSAGES, SEED_THREADS } from '@/mocks/data/workspace-seed'
import { inAppPaths, pathLiterals, routePatternOf } from './route-paths'

describe('reading path literals', () => {
  it('replaces an interpolation with a stand-in and drops the query', () => {
    expect(pathLiterals('to={`/accounts/${encodeURIComponent(id)}/risk?from=${from}`}')).toEqual([{ path: '/accounts/x/risk', interpolated: true }])
  })
  it('reads single- and double-quoted literals', () => {
    expect(pathLiterals(`a('/blotter'); b("/t/th-brief")`)).toEqual([{ path: '/blotter', interpolated: false }, { path: '/t/th-brief', interpolated: false }])
  })
  it('leaves out API paths', () => expect(pathLiterals("http.get('/api/workspace/threads')")).toEqual([]))
})

describe('matching the router', () => {
  it('names the pattern a path takes', () => {
    expect(routePatternOf('/')).toBe('/')
    expect(routePatternOf('/t/th-brief')).toBe('/t/:threadId')
    expect(routePatternOf('/accounts/acc-002/risk')).toBe('/accounts/:accountId/risk')
    expect(routePatternOf('/supervision/orders/prop-001')).toBe('/supervision/:kind/:id')
  })
  it('the catch-all is not a match: the old main-site paths have none', () => {
    expect(routePatternOf('/portfolios/trading')).toBeUndefined()
    expect(routePatternOf('/portfolios/accounts/acc-005')).toBeUndefined()
    expect(routePatternOf('/clients/onboard/step-2')).toBeUndefined()
  })
})

describe('every in-app link resolves', () => {
  const found = inAppPaths()

  it('reads the app: the Desk, the full views and the reference views are among the paths', () => {
    const paths = new Set(found.map((f) => f.path))
    for (const p of ['/t/x', '/supervision', '/archive', '/blotter', '/accounts/x/attribution', '/models/x', '/households/x', '/prospects/x']) expect(paths).toContain(p)
  })

  it.each(found.map((f) => [f.file, f.path] as const))('%s: %s is a route', (_file, path) => {
    expect(routePatternOf(path)).toBeDefined()
  })

  it('a thread link written out names a seeded thread', () => {
    const threads = new Set(SEED_THREADS.map((t) => t.id))
    const written = found.filter((f) => !f.interpolated && f.path.startsWith('/t/'))
    expect(written.length).toBeGreaterThan(0)
    for (const f of written) expect(threads, `${f.file}: ${f.path}`).toContain(f.path.slice('/t/'.length))
  })

  it('every thread a seeded message links to is seeded', () => {
    const threads = new Set(SEED_THREADS.map((t) => t.id))
    for (const m of SEED_MESSAGES) {
      for (const key of ['targetThreadId', 'meetingThreadId', 'fromThreadId', 'clientThreadId'] as const) {
        const id = (m as Partial<Record<typeof key, unknown>>)[key]
        if (typeof id === 'string') expect(threads, `${m.id}.${key}`).toContain(id)
      }
    }
  })
})
