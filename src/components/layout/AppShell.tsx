import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BreadcrumbBar } from './BreadcrumbBar'
import { StatusBar } from './StatusBar'
import { AIChatPanel } from '@/features/ai-assistant/AIChatPanel'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

const NAV_ROUTES = ['/dashboard', '/clients', '/portfolios', '/growth', '/workflows', '/settings'] as const

export function AppShell() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const openSearch = useUIStore((s) => s.openGlobalSearch)
  const toggleAI = useUIStore((s) => s.toggleAIPanel)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)
  const navigate = useNavigate()

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
      if (meta && e.key === 'j') {
        e.preventDefault()
        toggleAI()
      }
      if (meta && e.key === 'm') {
        e.preventDefault()
        toggleMessaging()
      }

      // Alt+1..5 navigation shortcuts
      if (e.altKey && !meta && !e.shiftKey) {
        const idx = Number(e.key) - 1
        const route = NAV_ROUTES[idx]
        if (route) {
          e.preventDefault()
          navigate(route)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch, toggleAI, toggleMessaging, navigate])

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-accent-blue focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar />
      <TopBar />
      <BreadcrumbBar />

      {/* Main content area */}
      <main
        id="main-content"
        aria-label="Main content"
        className={cn(
          'pt-[calc(theme(spacing.topbar)+theme(spacing.breadcrumb))] pb-statusbar transition-[margin] duration-200 ease-in-out',
          sidebarExpanded ? 'ml-sidebar-expanded' : 'ml-sidebar-collapsed',
        )}
        style={{ marginRight: aiPanelOpen ? aiPanelWidth : 0 }}
      >
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* AI Chat Panel */}
      {aiPanelOpen && <AIChatPanel />}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      <StatusBar />
    </div>
  )
}
