import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type MultiSelectOption = {
  value: string
  label: string
  icon?: React.ReactNode
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  className?: string
}

export function MultiSelect({ options, selected, onChange, placeholder, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll focused option into view
  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return
    const item = listRef.current.querySelectorAll('[role="option"]')[focusedIndex] as Element | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, open])

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    setFocusedIndex(open ? 0 : -1)
  }, [open])

  const toggle = useCallback((value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }, [selected, onChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length)
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(options.length - 1)
        break
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const focused = options[focusedIndex]
        if (focused) toggle(focused.value)
        break
      }
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
    }
  }

  const selectedLabels = options.filter((o) => selected.includes(o.value))
  const listboxId = 'multiselect-listbox'
  const activeDescendantId = focusedIndex >= 0 ? `multiselect-option-${focusedIndex}` : undefined

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? activeDescendantId : undefined}
        className={cn(
          'flex min-w-[160px] items-center gap-2 rounded-md border bg-surface-primary px-3 py-1.5 text-caption transition-colors',
          open ? 'border-accent-blue ring-1 ring-accent-blue' : 'border-border-primary hover:border-border-secondary',
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {selectedLabels.length === 0 ? (
            <span className="text-text-tertiary">{placeholder}</span>
          ) : selectedLabels.length <= 2 ? (
            selectedLabels.map((opt) => (
              <span
                key={opt.value}
                className="flex items-center gap-1 rounded bg-surface-tertiary px-1.5 py-0.5 text-text-primary"
              >
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                {opt.label}
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(opt.value) }}
                  className="ml-0.5 rounded-xs text-text-tertiary hover:text-text-primary"
                  aria-label={`Remove ${opt.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-text-primary">{selectedLabels.length} selected</span>
          )}
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-md border border-border-primary bg-surface-primary py-1 shadow-lg animate-scale-in max-h-60 overflow-y-auto"
        >
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-caption text-text-tertiary hover:bg-surface-tertiary"
            >
              Clear all
            </button>
          )}
          {options.map((opt, i) => {
            const isSelected = selected.includes(opt.value)
            const isFocused = focusedIndex === i
            return (
              <button
                key={opt.value}
                id={`multiselect-option-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => toggle(opt.value)}
                onMouseEnter={() => setFocusedIndex(i)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-caption transition-colors',
                  isFocused ? 'bg-surface-tertiary' : 'hover:bg-surface-tertiary',
                  isSelected && !isFocused && 'bg-accent-blue/5',
                )}
              >
                <span className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  isSelected
                    ? 'border-accent-blue bg-accent-blue text-white'
                    : 'border-border-secondary',
                )}>
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                {opt.icon && <span className="shrink-0 text-text-secondary">{opt.icon}</span>}
                <span className={cn('text-left', isSelected ? 'text-text-primary font-medium' : 'text-text-secondary')}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
