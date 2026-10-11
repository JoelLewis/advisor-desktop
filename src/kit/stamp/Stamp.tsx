import { cn } from '@/lib/utils'
import { fmtTimestamp } from '@/kit/measure'

type StampProps = { state: 'approved' | 'awaiting'; person: string; role?: string; at?: string }

export function Stamp({ state, person, role, at }: StampProps) {
  const approved = state === 'approved'
  return (
    <div role="status" className="flex flex-wrap items-center gap-4">
      <span data-stamp={state}
        className={cn('px-3 py-1.5 stretch-wide text-total uppercase tracking-wide',
          approved ? 'bg-ink text-face' : 'border-2 border-ink text-ink text-body font-semibold')}>
        {approved ? 'APPROVED' : 'AWAITING YOUR SIGNATURE'}
      </span>
      <span className="flex flex-col text-body">
        <span className="font-semibold">{person}</span>
        {role ? <span className="text-ink-2">{role}</span> : null}
        {at ? <span className="tabular text-ink-3">{fmtTimestamp(at)}</span> : null}
      </span>
    </div>
  )
}
