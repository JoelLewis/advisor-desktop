import { cn } from '@/lib/utils'

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-border-primary">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-3 py-1.5 text-caption font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]',
            value === opt.id
              ? 'bg-accent-blue text-white'
              : 'text-text-secondary hover:bg-surface-tertiary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
