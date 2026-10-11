import { cn } from '@/lib/utils'
import { fmtTimestamp } from '@/kit/measure'

export type TrailState = 'DONE' | 'PENDING' | 'NOT STARTED'
type TrailStep = { label: string; actor: string; state: TrailState; at?: string }

const STATE: Record<TrailState, string> = {
  DONE: 'bg-ink text-face',
  PENDING: 'border border-ink text-ink',
  'NOT STARTED': 'border border-dashed border-ink-3 text-ink-3',
}

export function RecordTrail({ steps }: { steps: TrailStep[] }) {
  return (
    <ol aria-label="Record trail" className="border-t border-ink">
      {steps.map((s, i) => (
        <li key={`${i}-${s.label}`} className="grid grid-cols-[10rem_1fr_8rem_auto] items-center gap-3 border-b border-rule py-2 text-body max-[700px]:grid-cols-1">
          <span className="tabular text-label text-ink-3">
            {s.at ? fmtTimestamp(s.at) : (<><span aria-hidden="true">—</span><span className="sr-only">Not yet recorded</span></>)}
          </span>
          <span>{s.label}</span>
          <span className="text-ink-2">{s.actor}</span>
          <span className={cn('justify-self-start px-1.5 text-label uppercase', STATE[s.state])}>{s.state}</span>
        </li>
      ))}
    </ol>
  )
}
