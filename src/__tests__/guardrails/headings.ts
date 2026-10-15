import type { RouteObject } from 'react-router-dom'

export function countH1(container: ParentNode): number {
  return container.querySelectorAll('h1, [role="heading"][aria-level="1"]').length
}

const join = (base: string, path: string) => (path.startsWith('/') ? path : `${base.replace(/\/$/, '')}/${path}`)

/** Every concrete path in a route table; splats are left to an explicit not-found case. */
export function routePaths(routes: RouteObject[], base = '/'): string[] {
  const paths = routes.flatMap((route) => {
    if (route.path?.includes('*')) return []
    const here = route.index ? base : route.path !== undefined ? join(base, route.path) : base
    const own = route.index || (route.path !== undefined && !route.children) ? [here] : []
    return [...own, ...(route.children ? routePaths(route.children, here) : [])]
  })
  return [...new Set(paths)]
}

export function assertSingleH1(container: ParentNode): void {
  const n = countH1(container)
  if (n !== 1) throw new Error(`expected exactly one h1, found ${n}`)
}
