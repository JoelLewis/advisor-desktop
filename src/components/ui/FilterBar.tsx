import { cn } from '@/lib/utils'

type FilterOption = {
  value: string
  label: string
}

type FilterBarProps = {
  filters: {
    name: string
    options: FilterOption[]
    value: string
    onChange: (value: string) => void
  }[]
  className?: string
}

export function FilterBar({ filters, className }: FilterBarProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {filters.map((filter) => (
        <select
          key={filter.name}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          aria-label={filter.name}
          className="rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-caption text-text-primary outline-hidden transition-colors hover:border-border-secondary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}
