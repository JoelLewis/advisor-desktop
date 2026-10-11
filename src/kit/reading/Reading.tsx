import { cn } from '@/lib/utils'
import { isNegative } from '@/kit/measure'
import { StatusCode } from '@/kit/status/StatusCode'
import type { Status } from '@/kit/status/status'

const SIZE = {
  body: 'text-body',
  total: 'text-total stretch-wide',
  'readout-sm': 'text-readout-sm stretch-readout font-light',
  'readout-md': 'text-readout-md stretch-readout font-light',
  'readout-lg': 'text-readout-lg stretch-readout font-light',
} as const

type ReadingProps = {
  label?: string
  value: string
  unit?: string
  size?: keyof typeof SIZE
  limit?: string
  status?: Status
}

export function Reading({ label, value, unit, size = 'body', limit, status }: ReadingProps) {
  const negative = isNegative(value)
  return (
    <div className="inline-flex flex-col gap-1">
      {label ? <span className="text-label uppercase text-ink-3">{label}</span> : null}
      <span className="inline-flex items-baseline gap-2">
        <span data-negative={String(negative)} className={cn('tabular text-ink', SIZE[size], negative && 'font-semibold')}>
          {value}
        </span>
        {unit ? <span className="text-body text-ink-3">{unit}</span> : null}
        {status ? <StatusCode status={status} /> : null}
      </span>
      {limit ? <span className="text-label text-ink-3">{limit}</span> : null}
    </div>
  )
}
