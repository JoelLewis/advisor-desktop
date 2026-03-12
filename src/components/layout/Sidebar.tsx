import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Zap,
  Users,
  Home,
  PieChart,
  ArrowRightLeft,
  TrendingUp,
  Megaphone,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { usePlatform } from '@/hooks/use-platform'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', key: '1' },
  { to: '/actions', icon: Zap, label: 'Actions', key: '2' },
  { to: '/clients', icon: Users, label: 'Clients', key: '3' },
  { to: '/households', icon: Home, label: 'Households', key: '4' },
  { to: '/portfolios', icon: PieChart, label: 'Portfolios', key: '5' },
  { to: '/portfolios/trading', icon: ArrowRightLeft, label: 'Trading', key: '6' },
  { to: '/growth', icon: TrendingUp, label: 'Growth', key: '7' },
  { to: '/engage', icon: Megaphone, label: 'Engage', key: '8' },
] as const

const UTILITY_ITEMS = [
  { to: '/workflows', icon: CheckSquare, label: 'Workflows', key: '9' },
  { to: '/settings', icon: Settings, label: 'Settings', key: '0' },
] as const

export function Sidebar() {
  const expanded = useUIStore((s) => s.sidebarExpanded)
  const toggle = useUIStore((s) => s.toggleSidebar)
  const { alt } = usePlatform()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-30 flex flex-col border-r border-border-primary bg-surface-primary transition-[width] duration-200 ease-in-out',
        expanded ? 'w-sidebar-expanded' : 'w-sidebar-collapsed',
      )}
    >
      {/* Logo area */}
      <div className="flex h-topbar items-center border-b border-border-primary px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-text-primary text-surface-primary font-display text-[15px] font-semibold tracking-tight">
            AD
          </div>
          {expanded && (
            <span className="whitespace-nowrap text-body-strong text-text-primary">
              Advisor Desktop
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 mx-2 rounded-md px-3 py-2.5 text-body transition-colors duration-150',
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue font-semibold'
                  : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              )
            }
            title={expanded ? undefined : item.label}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {expanded && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                <kbd className="hidden text-caption text-text-tertiary group-hover:inline">
                  {alt}+{item.key}
                </kbd>
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="mx-4 my-2 border-t border-border-primary" />

        {UTILITY_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 mx-2 rounded-md px-3 py-2.5 text-body transition-colors duration-150',
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue font-semibold'
                  : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              )
            }
            title={expanded ? undefined : item.label}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {expanded && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                <kbd className="hidden text-caption text-text-tertiary group-hover:inline">
                  {alt}+{item.key}
                </kbd>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="flex h-10 items-center justify-center border-t border-border-primary text-text-tertiary transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  )
}
