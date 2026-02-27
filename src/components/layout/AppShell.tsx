import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BreadcrumbBar } from './BreadcrumbBar'
import { StatusBar } from './StatusBar'
import { AIChatPanel } from '@/features/ai-assistant/AIChatPanel'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { QuickCaptureDialog } from '@/features/quick-capture/QuickCaptureDialog'
import { AnnotationFAB } from '@/features/annotations/AnnotationFAB'
import { AnnotationOverlay } from '@/features/annotations/AnnotationOverlay'
import { AnnotationPanel } from '@/features/annotations/AnnotationPanel'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { useBreakpoint } from '@/hooks/use-breakpoint'

const NAV_ROUTES = ['/dashboard', '/actions', '/clients', '/households', '/portfolios', '/portfolios/trading', '/growth', '/engage', '/workflows', '/settings'] as const

export function AppShell() {
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const aiPanelWidth = useUIStore((s) => s.aiPanelWidth)
  const annotationsEnabled = useUIStore((s) => s.annotationsEnabled)
  const annotationPanelOpen = useUIStore((s) => s.annotationPanelOpen)
  const openSearch = useUIStore((s) => s.openGlobalSearch)
  const toggleAI = useUIStore((s) => s.toggleAIPanel)
  const toggleMessaging = useUIStore((s) => s.toggleMessaging)
  const toggleAnnotations = useUIStore((s) => s.toggleAnnotations)
  const openQuickCapture = useUIStore((s) => s.openQuickCapture)
  const navigate = useNavigate()
  const { isBase } = useBreakpoint()

  // Auto-collapse sidebar when viewport shrinks below xl
  useEffect(() => {
    if (isBase) {
      const { sidebarExpanded: expanded, toggleSidebar } = useUIStore.getState()
      if (expanded) toggleSidebar()
    }
  }, [isBase])

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
      if (meta && e.key === '.') {
        e.preventDefault()
        toggleAnnotations()
      }
      if (meta && e.key === '/') {
        e.preventDefault()
        openQuickCapture()
      }

      // Alt+1..9,0 navigation shortcuts
      if (e.altKey && !meta && !e.shiftKey) {
        const idx = e.key === '0' ? 9 : Number(e.key) - 1
        const route = NAV_ROUTES[idx]
        if (route) {
          e.preventDefault()
          navigate(route)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch, toggleAI, toggleMessaging, toggleAnnotations, openQuickCapture, navigate])

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
        style={{
          marginRight: aiPanelOpen && !isBase ? aiPanelWidth : 0,
          paddingBottom: annotationPanelOpen ? 'var(--drawer-height, 0px)' : undefined,
        }}
      >
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* AI Chat Panel */}
      {aiPanelOpen && <AIChatPanel />}

      {/* Annotation Layer */}
      <AnnotationFAB />
      {annotationsEnabled && <AnnotationOverlay />}
      {annotationsEnabled && <AnnotationPanel />}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Quick Capture (Ctrl+/) */}
      <QuickCaptureDialog />

      <StatusBar />
    </div>
  )
}
