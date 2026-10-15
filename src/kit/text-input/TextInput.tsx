import { useId } from 'react'

type TextInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  readOnly?: boolean
  id?: string
  describedBy?: string
}

export function TextInput({ label, value, onChange, placeholder, rows = 3, disabled, readOnly, id: givenId, describedBy }: TextInputProps) {
  const generatedId = useId()
  const id = givenId ?? generatedId
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-label tracking-normal text-ink-3">{label}</label>
      <textarea id={id} value={value} rows={rows} placeholder={placeholder} disabled={disabled} readOnly={readOnly} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xs border border-ink bg-transparent px-3 py-2 text-copy text-ink placeholder:text-ink-3 disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-progress read-only:opacity-50" />
    </div>
  )
}
