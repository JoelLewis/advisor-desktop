import { useId } from 'react'
import { cn } from '@/lib/utils'
import { fmtScore, fmtTimestamp } from '@/kit/measure'

export type Source = { label: string; detail?: string; asOf?: string; confidence?: number }

// Every part draws its "·" in a 1rem gutter to its left. The row is pulled left by that gutter inside a
// clipping box, so the separator of whichever part starts a line falls outside and is clipped: separators
// only ever appear between parts on the same line, never dangling at a wrap. Alt text '' keeps them silent.
const PART = "whitespace-nowrap before:inline-block before:w-4 before:text-center before:text-ink-3 before:content-['·'_/_'']"

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
      <ul aria-labelledby={labelId} className="m-0 flex min-w-0 list-none flex-wrap items-center gap-2 p-0">
        {sources.map((s, index) => (
          <li key={`${index}:${s.label}`} className="min-w-0 border border-rule-2 px-2 py-0.5 text-label normal-case text-ink-2">
            <span className="block overflow-hidden">
              <span className="-ml-4 flex flex-wrap items-baseline">
                <span data-part="chip-part" className={cn(PART, 'font-semibold text-ink')}>{s.label}</span>
                {chipParts(s).map((part) => <span key={part} data-part="chip-part" className={PART}>{part}</span>)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
