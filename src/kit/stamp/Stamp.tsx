import { cn } from '@/lib/utils'
import { fmtEasternStamp } from '@/kit/measure'

type StampProps =
  | { state: 'approved'; person: string; role?: string; at: string }
  | { state: 'awaiting'; person?: string; role?: string }

export function Stamp(props: StampProps) {
  const approved = props.state === 'approved'
  const at = approved ? props.at : undefined
  const { person, role } = props
  return (
    <div role="status" className="flex flex-wrap items-center gap-4">
      <span data-stamp={props.state}
        className={cn('px-3 py-1.5 stretch-wide text-total uppercase tracking-wide',
          approved ? 'bg-ink text-face' : 'border-2 border-ink text-ink text-body font-semibold')}>
        {approved ? 'APPROVED' : 'AWAITING YOUR SIGNATURE'}
      </span>
      {person || role || at ? (
        <span className="flex flex-col text-body">
          {person ? <span className="font-semibold">{person}</span> : null}
          {role ? <span className="text-ink-2">{role}</span> : null}
          {at ? <span className="tabular text-ink-3">{fmtEasternStamp(at)}</span> : null}
        </span>
      ) : null}
    </div>
  )
}
