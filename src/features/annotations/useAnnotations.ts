import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTE_ANNOTATIONS } from './annotation-config'
import type { RouteAnnotations } from '@/types/annotation'

/** Match current pathname to annotation config. Exact first, then prefix. */
export function useAnnotations(): RouteAnnotations | null {
  const { pathname } = useLocation()

  return useMemo(() => {
    // Exact match
    const exact = ROUTE_ANNOTATIONS.find((r) => r.route === pathname)
    if (exact) return exact

    // Prefix match for parameterized routes (e.g. /clients/:id → /clients/cli-001)
    const prefix = ROUTE_ANNOTATIONS.find((r) => {
      if (!r.route.includes(':')) return false
      const base = r.route.split(':')[0]
      return base && pathname.startsWith(base) && pathname !== base.slice(0, -1)
    })
    return prefix ?? null
  }, [pathname])
}
