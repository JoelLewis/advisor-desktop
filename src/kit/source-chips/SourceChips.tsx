import { useId } from 'react'
import { fmtScore, fmtTimestamp } from '@/kit/measure'

export type Source = { label: string; detail?: string; asOf?: string; confidence?: number }

function Separator() {
  return <span aria-hidden="true">·</span>
}

function chipParts(s: Source): string[] {
  return [
    ...(s.detail ? [s.detail] : []),
    ...(s.asOf ? [`as of ${fmtTimestamp(s.asOf)}`] : []),
    ...(s.confidence !== undefined ? [`confidence ${fmtScore(s.confidence)}`] : []),
  ]
}

export function SourceChips({ sources }: { sources: Source[] }) {
  const labelId = useId()
  if (sources.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id={labelId} className="text-label uppercase text-ink-3">Relies on</span>
      <ul aria-labelledby={labelId} className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {sources.map((s, index) => (
          <li key={`${index}:${s.label}`} className="inline-flex flex-wrap items-baseline gap-1.5 border border-rule-2 px-2 py-0.5 text-label normal-case text-ink-2">
            <span className="font-semibold text-ink">{s.label}</span>
            {chipParts(s).map((part) => (
              <span key={part} className="inline-flex items-baseline gap-1.5">
                <Separator />
                <span>{part}</span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
