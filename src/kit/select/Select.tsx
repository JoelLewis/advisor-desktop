import { useId } from 'react'

export type SelectOption = { value: string; label: string }

type SelectProps = {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
}

export function Select({ label, value, options, onChange }: SelectProps) {
  const id = useId()
  return (
    <span className="inline-flex items-center gap-2">
      <label htmlFor={id} className="text-label uppercase text-ink-3">{label}</label>
      <span className="relative inline-flex">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-xs border border-ink bg-transparent pl-3 pr-8 text-body font-semibold text-ink hover:bg-face">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg aria-hidden="true" viewBox="0 0 8 5" className="pointer-events-none absolute right-3 top-1/2 w-2 -translate-y-1/2 fill-ink">
          <path d="M0 0h8L4 5z" />
        </svg>
      </span>
    </span>
  )
}
