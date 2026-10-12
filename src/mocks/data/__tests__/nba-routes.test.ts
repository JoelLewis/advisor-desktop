import { describe, it, expect } from 'vitest'
import { matchRoutes } from 'react-router-dom'
import { routes } from '@/app/routes'
import { nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'

const leafOf = (path: string) => {
  const matches = matchRoutes(routes, path) ?? []
  return matches[matches.length - 1]
}

describe('every NBA action route resolves to a real workspace route', () => {
  const routed = nbas.flatMap((n) => (n.actionRoute?.path ? [[n.id, n.actionRoute.path] as const] : []))

  it('reads the route tree (a dead link falls through to not found)', () => {
    expect(leafOf('/portfolios/rebalance')?.route.path).toBe('*')
    expect(routed.length).toBeGreaterThan(15)
  })

  it.each(routed)('%s → %s', (_, path) => {
    const leaf = leafOf(path)
    expect(leaf, `${path} matches no route`).toBeDefined()
    expect(leaf?.route.path, `${path} falls through to not found`).not.toBe('*')
    const { accountId, threadId } = leaf?.params ?? {}
    if (accountId !== undefined) expect(accounts.some((a) => a.id === accountId), `${accountId} is not an account`).toBe(true)
    if (threadId !== undefined) expect(SEED_THREADS.some((t) => t.id === threadId), `${threadId} is not a thread`).toBe(true)
  })
})
