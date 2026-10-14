import { useId } from 'react'

type NumberInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  unit?: string
  error?: string
  disabled?: boolean
  /** Called on Enter and on blur: the caller turns the text into an edit. Without it, Enter submits the enclosing form. */
  onCommit?: () => void
}

/** A labeled number field. It holds text; parsing and validation belong to the caller and the engine. */
export function NumberInput({ label, value, onChange, unit, error, disabled, onCommit }: NumberInputProps) {
  const id = useId()
  const errorId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-label uppercase text-ink-3">
        {label}{unit ? <> <span className="normal-case">{unit}</span></> : null}
      </label>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" value={value} disabled={disabled}
        aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)} onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === 'Enter' && onCommit) { e.preventDefault(); onCommit() } }}
        className="tabular w-full max-w-48 rounded-xs border border-ink bg-transparent px-3 py-1.5 text-copy text-ink aria-invalid:border-2 disabled:cursor-not-allowed disabled:border-rule-2 disabled:text-ink-3" />
      {error ? <p id={errorId} className="text-label normal-case text-ink">{error}</p> : null}
    </div>
  )
}
