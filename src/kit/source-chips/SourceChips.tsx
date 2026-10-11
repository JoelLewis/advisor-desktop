import { fmtScore, fmtTimestamp } from '@/kit/measure'

export type Source = { label: string; detail?: string; asOf?: string; confidence?: number }

export function SourceChips({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-label uppercase text-ink-3">Relies on</span>
      {sources.map((s) => (
        <span key={s.label + (s.detail ?? '')} className="inline-flex flex-wrap items-baseline gap-1.5 border border-rule-2 px-2 py-0.5 text-label normal-case text-ink-2">
          <span className="font-semibold text-ink">{s.label}</span>
          {s.detail ? <span>{s.detail}</span> : null}
          {s.asOf ? <span>{`as of ${fmtTimestamp(s.asOf)}`}</span> : null}
          {s.confidence !== undefined ? <span>{`confidence ${fmtScore(s.confidence)}`}</span> : null}
        </span>
      ))}
    </div>
  )
}
