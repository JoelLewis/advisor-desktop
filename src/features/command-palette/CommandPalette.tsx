import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, User, Building2, Briefcase, FileText,
  Zap,
} from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { useCommandSearch } from '@/hooks/use-command-search'
import { cn } from '@/lib/utils'
import type { SearchResultType } from '@/services/search'

const TYPE_CONFIG: Record<SearchResultType, { icon: typeof User; label: string }> = {
  client: { icon: User, label: 'Client' },
  household: { icon: Building2, label: 'Household' },
  account: { icon: Briefcase, label: 'Account' },
  page: { icon: FileText, label: 'Page' },
  action: { icon: Zap, label: 'Action' },
}

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.globalSearchOpen)
  const close = useUIStore((s) => s.closeGlobalSearch)
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, setQuery, results, isLoading } = useCommandSearch()
  const [activeIndex, setActiveIndex] = useState(0)

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      // Small delay to let the DOM render before focusing
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen, setQuery])

  // Reset active index on results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  const handleSelect = useCallback((route: string) => {
    close()
    if (route === '__ai__') {
      setInitialMessage('How can I help you today?')
    } else {
      navigate(route)
    }
  }, [close, navigate, setInitialMessage])

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      handleSelect(results[activeIndex].route)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 animate-fade-in"
        onClick={close}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2 animate-scale-in">
        <div className="overflow-hidden rounded-xl border border-border-primary bg-surface-primary shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border-primary px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, accounts, or type > for actions..."
              className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-tertiary focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={close}
              className="flex h-6 items-center rounded border border-border-primary px-1.5 text-[10px] font-medium text-text-tertiary"
            >
              ESC
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
            {query.length < 2 ? (
              <div className="flex h-20 items-center justify-center text-caption text-text-tertiary">
                Type to search clients, accounts, or actions...
              </div>
            ) : isLoading ? (
              <div className="flex h-20 items-center justify-center text-caption text-text-tertiary">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-caption text-text-tertiary">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => {
                  const config = TYPE_CONFIG[result.type]
                  const Icon = config.icon
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result.route)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        index === activeIndex
                          ? 'bg-accent-blue/10 text-accent-blue'
                          : 'text-text-primary hover:bg-surface-tertiary',
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        index === activeIndex ? 'bg-accent-blue/20' : 'bg-surface-tertiary',
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body-strong">{result.title}</div>
                        <div className="truncate text-caption text-text-secondary">{result.subtitle}</div>
                      </div>
                      <span className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                        index === activeIndex ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-tertiary text-text-tertiary',
                      )}>
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t border-border-primary px-4 py-2 text-[10px] text-text-tertiary">
            <span><kbd className="rounded border border-border-primary px-1 font-mono">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded border border-border-primary px-1 font-mono">↵</kbd> Open</span>
            <span><kbd className="rounded border border-border-primary px-1 font-mono">esc</kbd> Close</span>
            <span className="ml-auto"><kbd className="rounded border border-border-primary px-1 font-mono">&gt;</kbd> Actions</span>
          </div>
        </div>
      </div>
    </>
  )
}
