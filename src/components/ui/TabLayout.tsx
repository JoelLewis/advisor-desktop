import { useState, useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Tab = {
  id: string
  label: string
  content: React.ReactNode
  count?: number
}

type TabLayoutProps = {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

/**
 * Review round 2, Important · a `?tab=` search param on the route (e.g. an NBA's
 * `actionRoute.params.tab`) previously did nothing — `TabLayout` never read the URL at all, so
 * navigating to `/portfolios/accounts/acc-011?tab=concentration` silently opened Overview instead
 * of Concentration. An unknown or absent `tab` param falls back to `defaultTab` (and then
 * `tabs[0]`) exactly as before, so the three existing hardcoded-literal callers (EngagePage,
 * RevenuePage, ActionsPage) are unaffected — this only changes behavior when a *valid* `tab` id
 * is present in the URL, which none of them currently produce.
 */
function initialTabFrom(urlTab: string | null, tabs: Tab[], defaultTab?: string): string {
  if (urlTab && tabs.some((t) => t.id === urlTab)) return urlTab
  return defaultTab ?? tabs[0]?.id ?? ''
}

export function TabLayout({ tabs, defaultTab, className }: TabLayoutProps) {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => initialTabFrom(searchParams.get('tab'), tabs, defaultTab))
  const instanceId = useId()

  const activeContent = tabs.find((t) => t.id === activeTab)?.content

  function handleKeyDown(e: React.KeyboardEvent) {
    if (tabs.length === 0) return
    const currentIndex = tabs.findIndex((t) => t.id === activeTab)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveTab(tabs[(currentIndex + 1) % tabs.length]!.id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]!.id)
    }
  }

  return (
    <div className={className}>
      <div className="flex border-b border-border-primary" role="tablist" onKeyDown={handleKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`${instanceId}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${instanceId}-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-body font-medium transition-colors',
              activeTab === tab.id
                ? 'text-accent-blue'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-mono-sm',
                  activeTab === tab.id
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'bg-surface-tertiary text-text-tertiary',
                )}>
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${instanceId}-panel-${activeTab}`}
        aria-labelledby={`${instanceId}-tab-${activeTab}`}
        className="mt-4 animate-fade-in"
      >
        {activeContent}
      </div>
    </div>
  )
}
