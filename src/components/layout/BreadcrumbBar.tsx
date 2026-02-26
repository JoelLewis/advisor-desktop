import { Link, useMatches } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

type RouteHandle = {
  breadcrumb?: string
}

export function BreadcrumbBar() {
  const matches = useMatches()
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)

  const crumbs = matches
    .filter((m) => (m.handle as RouteHandle | undefined)?.breadcrumb)
    .map((m) => ({
      label: (m.handle as RouteHandle).breadcrumb!,
      path: m.pathname,
    }))

  // Fallback: derive from pathname if no handle breadcrumbs
  if (crumbs.length === 0) {
    const segments = matches[matches.length - 1]?.pathname.split('/').filter(Boolean) ?? []
    segments.forEach((seg, i) => {
      crumbs.push({
        label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
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
      style={{ top: 'var(--spacing-topbar, 56px)', right: aiPanelOpen ? aiPanelWidth : 0 }}
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
