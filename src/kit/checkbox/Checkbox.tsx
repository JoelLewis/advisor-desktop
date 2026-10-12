import { useId } from 'react'

type CheckboxProps = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; describedBy?: string }

export function Checkbox({ label, checked, onChange, disabled, describedBy }: CheckboxProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 appearance-none border border-ink-2 bg-face checked:bg-ink checked:inset-ring-3 checked:inset-ring-face disabled:cursor-not-allowed disabled:border-rule-2" />
      <label htmlFor={id} className="text-body text-ink">{label}</label>
    </div>
  )
}
