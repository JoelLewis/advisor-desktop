import { Link } from 'react-router-dom'
import { UNIT, fmtQuantity, fmtWeight } from '@/kit/measure'
import { useReconciliation } from '@/hooks/use-reference'
import { reconciliationHref } from '@/workspace/full-views/reference-href'
import type { Message } from '@/types/workspace'

type Notice = Extract<Message, { kind: 'reconciliation_notice' }>

/** The Brief's line for reconciliation: the open breaks and the cash match rate as they stand, and the way to the view. */
export function ReconciliationNoticeView({ notice }: { notice: Notice }) {
  const recon = useReconciliation()
  const cash = recon.data?.summary.rates.find((r) => r.kind === 'cash')
  const open = recon.data?.summary.openBreaks
  return (
    <article aria-label="Reference · Reconciliation" className="flex min-w-0 flex-col gap-2 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">Reference</p>
      <p className="text-copy font-semibold">Reconciliation</p>
      {recon.isError ? <p role="alert" className="text-body">{recon.error.message}</p>
        : open !== undefined && cash ? <p className="tabular text-copy">{`${fmtQuantity(open)} open ${open === 1 ? 'break' : 'breaks'} · cash matched ${fmtWeight(cash.rate)}${UNIT.pct}`}</p>
          : <p role="status" className="text-body text-ink-3">Loading reconciliation…</p>}
      <Link to={reconciliationHref(notice.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Open reconciliation</Link>
    </article>
  )
}
