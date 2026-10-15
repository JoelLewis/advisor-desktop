import { useId } from 'react'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }

type SelectProps = {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  /** 'inline' sits the label beside the field, as in a toolbar; 'stacked' sits it above, as in a form. */
  layout?: 'inline' | 'stacked'
  error?: string
}

export function Select({ label, value, options, onChange, layout = 'inline', error }: SelectProps) {
  const id = useId()
  const errorId = useId()
  const stacked = layout === 'stacked'
  return (
    <span className={cn(stacked ? 'flex min-w-0 flex-col items-start gap-1.5' : 'inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1')}>
      <label htmlFor={id} className="text-label tracking-normal text-ink-3">{label}</label>
      <span className="relative inline-flex min-w-0 max-w-full">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
          className="min-h-9 max-w-full min-w-0 appearance-none py-1.5 rounded-xs border border-ink bg-transparent pl-3 pr-8 text-body font-semibold text-ink hover:bg-face aria-invalid:border-2">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg aria-hidden="true" viewBox="0 0 8 5" className="pointer-events-none absolute right-3 top-1/2 w-2 -translate-y-1/2 fill-ink">
          <path d="M0 0h8L4 5z" />
        </svg>
      </span>
      {error ? <span id={errorId} className="text-label normal-case text-ink">{error}</span> : null}
    </span>
  )
}
