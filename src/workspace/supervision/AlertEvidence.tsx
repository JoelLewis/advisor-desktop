import { Pane } from '@/kit/layout/Pane'
import { RecordTrail } from '@/kit/record-trail/RecordTrail'
import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import type { AlertOutcome } from '@/types/workspace'
import type { AlertItem } from '@/types/workspace-supervision'

const DISPOSITION_WORDS: Readonly<Record<AlertOutcome, string>> = {
  approve: 'Approved by compliance; closed.',
  reject: 'Rejected by compliance; closed.',
  request_changes: 'Returned to the advisor for changes.',
}
const TERM = 'text-label uppercase text-ink-3'

export function AlertEvidence({ item }: { item: AlertItem }) {
  const { alert, trail, context } = item
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="Alert">
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone={alert.severity === 'critical' ? 'solid' : 'outline'}>{alert.severity}</Tag>
          <span>{alert.type}</span>
        </p>
        <p className="text-copy">{alert.description}</p>
        <p className="tabular text-label text-ink-3">{`${alert.id} · raised ${fmtTimestamp(alert.createdAt)}`}</p>
        {item.disposition ? <p className="text-body text-ink-2">{DISPOSITION_WORDS[item.disposition]}</p> : null}
      </Pane>
      <Pane title="Record trail">
        <RecordTrail steps={trail.map((r) => ({ label: r.action, actor: r.reviewer, state: 'DONE' as const, at: r.timestamp }))} />
        <ul aria-label="Reviewer notes" className="flex flex-col gap-1 text-body">
          {trail.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3">
              <span className="tabular text-label text-ink-3">{r.id}</span>
              <span>{r.notes}</span>
            </li>
          ))}
        </ul>
      </Pane>
      <Pane title="Account context">
        {context.accountName || context.clientName ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
            {context.clientName ? <><dt className={TERM}>Client</dt><dd>{context.clientName}</dd></> : null}
            {context.accountName ? <><dt className={TERM}>Account</dt><dd>{context.accountName}</dd></> : null}
          </dl>
        ) : <p className="text-body text-ink-3">The alert names no account or client.</p>}
      </Pane>
    </div>
  )
}
