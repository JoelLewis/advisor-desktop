import { cn } from '@/lib/utils'

type SegmentedOption<V extends string> = { value: V; label: string }
type SegmentedControlProps<V extends string> = { label: string; options: readonly SegmentedOption<V>[]; value: V; onChange: (value: V) => void }

/**
 * One of a few views of the same thing: a named group of buttons, the shown one pressed. Each is a button, so Tab
 * reaches it and Enter or Space chooses it; the pressed state is said, and shown by weight and fill, not color alone.
 */
export function SegmentedControl<V extends string>({ label, options, value, onChange }: SegmentedControlProps<V>) {
  return (
    <div role="group" aria-label={label} className="flex w-full border border-ink">
      {options.map((o) => {
        const pressed = o.value === value
        return (
          <button key={o.value} type="button" aria-pressed={pressed} onClick={() => onChange(o.value)}
            className={cn('min-h-9 flex-1 px-3 text-body coarse:min-h-11', pressed ? 'bg-ink font-semibold text-face' : 'bg-bg text-ink hover:underline')}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
