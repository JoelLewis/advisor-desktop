import { useId } from 'react'
import { cn } from '@/lib/utils'

type RadioOption<V extends string> = { value: V; label: string; disabled?: boolean }

type RadioGroupProps<V extends string> = {
  legend: string
  options: readonly RadioOption<V>[]
  /** Undefined while nothing is chosen. */
  value: V | undefined
  onChange: (value: V) => void
  describedBy?: string
}

/** One choice from a few, each label shown in full: a fieldset with its legend, so the group is named and long labels wrap. */
export function RadioGroup<V extends string>({ legend, options, value, onChange, describedBy }: RadioGroupProps<V>) {
  const name = useId()
  return (
    <fieldset aria-describedby={describedBy} className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1.5 text-label tracking-normal text-ink-3">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={cn('flex items-start gap-3 text-body', option.disabled ? 'cursor-not-allowed text-ink-3' : 'text-ink')}>
          <input type="radio" name={name} value={option.value} checked={value === option.value} disabled={option.disabled}
            onChange={() => onChange(option.value)}
            className="mt-0.5 size-4 shrink-0 appearance-none rounded-full border border-ink-2 bg-face checked:bg-ink checked:inset-ring-3 checked:inset-ring-face disabled:cursor-not-allowed disabled:border-rule-2" />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
