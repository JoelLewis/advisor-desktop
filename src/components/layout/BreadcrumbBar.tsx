import { useMemo } from 'react'
import { Link, useMatches } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useClient } from '@/hooks/use-clients'
import { useAccount } from '@/hooks/use-accounts'
import { useHousehold } from '@/hooks/use-households'

type RouteHandle = {
  breadcrumb?: string
}

/** Extract entity IDs from route matches (iterate leaf-first to get deepest pathname) */
function extractIds(matches: ReturnType<typeof useMatches>) {
  let clientId = ''
  let accountId = ''
  let householdId = ''
  let clientPath = ''
  let accountPath = ''
  let householdPath = ''

  // Walk from leaf to root — the deepest match with the param has the correct pathname
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]!
    const params = m.params as Record<string, string>
    if (params.clientId && !clientId) { clientId = params.clientId; clientPath = m.pathname }
    if (params.accountId && !accountId) { accountId = params.accountId; accountPath = m.pathname }
    if (params.householdId && !householdId) { householdId = params.householdId; householdPath = m.pathname }
  }

  return { clientId, accountId, householdId, clientPath, accountPath, householdPath }
}

/** Resolve "Client" / "Account" / "Household" breadcrumbs to entity names via reactive queries */
function useEntityNames(matches: ReturnType<typeof useMatches>): Map<string, string> {
  const { clientId, accountId, householdId, clientPath, accountPath, householdPath } = useMemo(
    () => extractIds(matches),
    [matches],
  )

  const { data: client } = useClient(clientId)
  const { data: account } = useAccount(accountId)
  const { data: household } = useHousehold(householdId)

  return useMemo(() => {
    const names = new Map<string, string>()
    if (client?.fullName) names.set(clientPath, client.fullName)
    if (account?.name) names.set(accountPath, account.name)
    if (household?.name) names.set(householdPath, household.name)
    return names
  }, [client?.fullName, account?.name, household?.name, clientPath, accountPath, householdPath])
}

export function BreadcrumbBar() {
  const matches = useMatches()
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const { isBase } = useBreakpoint()
  const entityNames = useEntityNames(matches)

  const crumbs = matches
    .filter((m) => (m.handle as RouteHandle | undefined)?.breadcrumb)
    .map((m) => ({
      label: entityNames.get(m.pathname) ?? (m.handle as RouteHandle).breadcrumb!,
      path: m.pathname,
    }))

  // Fallback: derive from pathname if no handle breadcrumbs
  if (crumbs.length === 0) {
    const segments = matches[matches.length - 1]?.pathname.split('/').filter(Boolean) ?? []
    segments.forEach((seg, i) => {
      const isDynamicId = /^(client|acc|hh|prospect)-/.test(seg)
      const label = isDynamicId
        ? '…' // Show ellipsis while entity names load, rather than raw IDs
        : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
      crumbs.push({
        label,
        path: '/' + segments.slice(0, i + 1).join('/'),
      })
    })
  }

  return (
    <div
      className={cn(
        'fixed z-10 flex h-breadcrumb items-center border-b border-border-primary bg-surface-secondary px-4 transition-[left,right] duration-200 ease-in-out',
        sidebarExpanded ? 'left-sidebar-expanded' : 'left-sidebar-collapsed',
      )}
      style={{ top: 'var(--spacing-topbar, 56px)', right: aiPanelOpen && !isBase ? aiPanelWidth : 0 }}
    >
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-caption">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-text-tertiary" />}
              {isLast ? (
                <span className="font-medium text-text-primary">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-text-secondary transition-colors hover:text-text-primary"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    </div>
  )
}
