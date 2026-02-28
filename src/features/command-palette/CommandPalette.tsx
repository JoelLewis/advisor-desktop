import { useEffect, useRef, useState, useCallback, useId, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, User, Building2, Briefcase, FileText,
  Zap,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
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

function ResultsPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-20 items-center justify-center text-caption text-text-tertiary">
      {children}
    </div>
  )
}

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.globalSearchOpen)
  const close = useUIStore((s) => s.closeGlobalSearch)
  const setInitialMessage = useUIStore((s) => s.setInitialMessage)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, setQuery, results, isLoading } = useCommandSearch()
  const [activeIndex, setActiveIndex] = useState(0)
  const listboxId = useId()

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
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

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (results[activeIndex]) {
          e.preventDefault()
          handleSelect(results[activeIndex].route)
        }
        break
    }
  }

  const activeResultId = results[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="top-[20%] translate-y-0 max-w-[640px]" aria-label="Command palette">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border-primary px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, accounts, or type > for actions..."
            className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-tertiary focus:outline-hidden"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activeResultId}
            aria-label="Search"
          />
          <button
            onClick={close}
            className="flex h-6 items-center rounded border border-border-primary px-1.5 text-[10px] font-medium text-text-tertiary"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div id={listboxId} role="listbox" className="max-h-[360px] overflow-y-auto scrollbar-thin">
          {query.length < 2 && (
            <ResultsPlaceholder>Type to search clients, accounts, or actions...</ResultsPlaceholder>
          )}
          {query.length >= 2 && isLoading && (
            <ResultsPlaceholder>Searching...</ResultsPlaceholder>
          )}
          {query.length >= 2 && !isLoading && results.length === 0 && (
            <ResultsPlaceholder>No results found for &ldquo;{query}&rdquo;</ResultsPlaceholder>
          )}
          {query.length >= 2 && !isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => {
                const config = TYPE_CONFIG[result.type]
                const Icon = config.icon
                const isActive = index === activeIndex
                return (
                  <button
                    key={result.id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(result.route)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isActive ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-primary hover:bg-surface-tertiary',
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      isActive ? 'bg-accent-blue/20' : 'bg-surface-tertiary',
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-body-strong">{result.title}</div>
                      <div className="truncate text-caption text-text-secondary">{result.subtitle}</div>
                    </div>
                    <span className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                      isActive ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-tertiary text-text-tertiary',
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
      </DialogContent>
    </Dialog>
  )
}
