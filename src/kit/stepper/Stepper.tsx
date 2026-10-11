import { cn } from '@/lib/utils'
import type { Step } from './step'

export function Stepper({ steps, currentId, label }: { steps: Step[]; currentId: string; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col border-t border-rule">
      {steps.map((step, i) => {
        const current = step.id === currentId
        return (
          <li
            key={step.id}
            aria-current={current ? 'step' : undefined}
            className={cn('grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-rule py-2 text-body', current && 'font-semibold')}
          >
            <span className="tabular text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <span>{step.label}</span>
            <span className={cn('px-1.5 text-label uppercase', step.state === 'DONE' ? 'bg-ink text-face' : 'border border-ink-2 text-ink-2')}>
              {step.state}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
