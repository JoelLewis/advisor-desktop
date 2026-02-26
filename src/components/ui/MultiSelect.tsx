import { useState, useRef, useEffect } from 'react'
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
  const ref = useRef<HTMLDivElement>(null)

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

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectedLabels = options.filter((o) => selected.includes(o.value))

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
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
                  className="ml-0.5 rounded-sm text-text-tertiary hover:text-text-primary"
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
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-md border border-border-primary bg-surface-primary py-1 shadow-lg animate-scale-in">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-caption text-text-tertiary hover:bg-surface-tertiary"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-caption transition-colors hover:bg-surface-tertiary',
                  isSelected && 'bg-accent-blue/5',
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
