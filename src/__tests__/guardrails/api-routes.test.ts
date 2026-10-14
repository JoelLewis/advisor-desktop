import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { matchRequestUrl, type RequestHandler } from 'msw'
import type { ProspectStepName } from '@/types/workspace-prospect'
import { listSourceFiles } from './detectors'

/**
 * The services and the MSW handlers agree. Every service function is called with stand-in arguments
 * while the API client records the request instead of sending it; each request must have a handler
 * for its method and path, and each handler route must be requested by some service. A route with no
 * caller is dead code; a request with no handler would reach the Worker's SPA fallback in the browser
 * and fail as HTML.
 */
type Request = { method: string; url: string; via: string }
const requests: Request[] = []
let via = ''

vi.mock('@/services/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api-client')>()
  const record = (method: string) => (path: string) => {
    requests.push({ method, url: `/api${path}`, via })
    return Promise.resolve(undefined)
  }
  return { ...actual, get: record('GET'), post: record('POST'), put: record('PUT') }
})

const STANDINS: readonly unknown[] = ['x', 'x', 'x', 'x', 'x']
const STEPS: readonly ProspectStepName[] = ['questionnaire', 'statements', 'accept']
/** Functions whose argument chooses the route are called once per route. */
const ARGUMENT_SETS: ReadonlyMap<string, readonly (readonly unknown[])[]> = new Map([
  ['workspace.takeHerStep', STEPS.map((step) => ['x', 'x', step])],
])

type Route = { method: string; path: string }
const BASE = 'http://localhost'

function routesOf(handlers: readonly RequestHandler[]): Route[] {
  return handlers.flatMap((h) => {
    const { method, path } = h.info as { method?: unknown; path?: unknown }
    // The workspace's 405 catch-all answers every method (a RegExp): it refuses edits, it is not a route a service calls.
    return typeof method === 'string' && typeof path === 'string' ? [{ method, path }] : []
  })
}

const serves = (route: Route, request: Request) =>
  route.method === request.method && matchRequestUrl(new URL(request.url, BASE), route.path, BASE).matches

let routes: Route[] = []

beforeAll(async () => {
  const dir = join(process.cwd(), 'src/services')
  for (const file of readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'api-client.ts')) {
    const service: Record<string, unknown> = await import(/* @vite-ignore */ join(dir, file))
    for (const [name, fn] of Object.entries(service)) {
      if (typeof fn !== 'function') continue
      via = `${file.replace(/\.ts$/, '')}.${name}`
      for (const args of ARGUMENT_SETS.get(via) ?? [STANDINS]) await (fn as (...a: readonly unknown[]) => unknown)(...args)
    }
  }
  const { handlers } = await import('@/mocks/handlers')
  routes = routesOf(handlers)
})

describe('the services and the handlers agree', () => {
  it('reads every service', () => {
    expect(new Set(requests.map((r) => r.via.split('.')[0]))).toEqual(new Set(['compliance', 'crm', 'custodian', 'oms', 'pms', 'reference', 'workspace']))
  })
  it('every request a service makes has a handler for its method and path', () => {
    expect(requests.filter((r) => !routes.some((route) => serves(route, r))).map((r) => `${r.via}: ${r.method} ${r.url}`)).toEqual([])
  })
  it('every handler route is requested by some service', () => {
    const uncalled = routes.filter((route) => !requests.some((r) => serves(route, r)))
    expect(uncalled.map((r) => `${r.method} ${r.path}`)).toEqual([])
  })
})

const UI_ROOTS = ['src/workspace', 'src/app', 'src/kit', 'src/hooks']
/** A request function (not `ApiClientError`) taken from the API client: only services make requests. */
const REQUEST_IMPORT = /import\s*\{[^}]*\b(get|post|put)\b[^}]*\}\s*from\s*['"]@\/services\/api-client['"]/

describe('only services make requests', () => {
  it.each(UI_ROOTS.flatMap(listSourceFiles))('%s imports no request function from the API client', (file) => {
    expect(readFileSync(join(process.cwd(), file), 'utf8')).not.toMatch(REQUEST_IMPORT)
  })
})
