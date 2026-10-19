import { useId, type ReactNode } from 'react'
import { fmtEasternStamp, fmtUtcStamp } from '@/kit/measure'

type RecordSlipProps = {
  kind: string; title: string; recordedBy: { name: string; role: string }; at: string; archive: string
  /** The books-and-records detail: shown to the firm, folded; an outsider's slip is given none. */
  audit?: { recordId: string; fingerprint?: string }
  children?: ReactNode
}

export function RecordSlip({ kind, title, recordedBy, at, archive, audit, children }: RecordSlipProps) {
  const titleId = useId()
  return (
    <article aria-labelledby={titleId} className="border border-dashed border-ink-2 bg-face p-4">
      <span className="text-label uppercase text-ink-2">{kind}</span>
      <h3 id={titleId} className="mt-1 text-body font-semibold">{title}</h3>
      {children ? <div className="mt-2 text-body">{children}</div> : null}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-2 text-label">
        <dt className="tracking-normal text-ink-3">Recorded by</dt><dd className="normal-case">{`${recordedBy.name}, ${recordedBy.role}`}</dd>
        <dt className="tracking-normal text-ink-3">At</dt><dd className="tabular normal-case">{fmtEasternStamp(at)}</dd>
        <dt className="tracking-normal text-ink-3">Archive</dt><dd className="normal-case">{archive}</dd>
      </dl>
      {audit ? (
        <details className="mt-2">
          <summary className="min-h-6 cursor-pointer text-label text-ink-3 coarse:min-h-11">Audit details</summary>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label">
            <dt className="tracking-normal text-ink-3">Record ID</dt><dd className="tabular normal-case">{audit.recordId}</dd>
            <dt className="tracking-normal text-ink-3">UTC</dt><dd className="tabular normal-case">{fmtUtcStamp(at)}</dd>
            {audit.fingerprint ? <><dt className="tracking-normal text-ink-3">Fingerprint</dt><dd className="tabular normal-case">{audit.fingerprint}</dd></> : null}
          </dl>
        </details>
      ) : null}
    </article>
  )
}
