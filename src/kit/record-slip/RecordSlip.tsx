import { useId, type ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'

type RecordSlipProps = {
  kind: string; title: string; recordId: string; fingerprint?: string
  recordedBy: { name: string; role: string }; at: string; archive: string; children?: ReactNode
}

export function RecordSlip({ kind, title, recordId, fingerprint, recordedBy, at, archive, children }: RecordSlipProps) {
  const titleId = useId()
  return (
    <article aria-labelledby={titleId} className="border border-dashed border-ink-2 bg-face p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label uppercase text-ink-2">{kind}</span>
        <span className="tabular shrink-0 whitespace-nowrap text-label text-ink-3"><span className="sr-only">Record ID </span>{recordId}</span>
      </div>
      <h3 id={titleId} className="mt-1 text-body font-semibold">{title}</h3>
      {children ? <div className="mt-2 text-body">{children}</div> : null}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-2 text-label">
        <dt className="uppercase text-ink-3">Recorded by</dt><dd className="normal-case">{`${recordedBy.name}, ${recordedBy.role}`}</dd>
        <dt className="uppercase text-ink-3">At</dt><dd className="tabular normal-case">{fmtTimestamp(at)}</dd>
        <dt className="uppercase text-ink-3">Archive</dt><dd className="normal-case">{archive}</dd>
        {fingerprint ? (<><dt className="uppercase text-ink-3">Fingerprint</dt><dd className="tabular normal-case">{fingerprint}</dd></>) : null}
      </dl>
    </article>
  )
}
