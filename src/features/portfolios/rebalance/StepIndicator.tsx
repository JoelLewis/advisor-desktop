import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepIndicator({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        let circleClass = 'bg-surface-tertiary text-text-tertiary'
        if (i < currentIndex) circleClass = 'bg-accent-green text-white'
        else if (i === currentIndex) circleClass = 'bg-accent-blue text-white'

        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-caption font-medium', circleClass)}>
              {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-caption', i === currentIndex ? 'font-medium text-text-primary' : 'text-text-tertiary')}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border-primary" />}
          </div>
        )
      })}
    </div>
  )
}
