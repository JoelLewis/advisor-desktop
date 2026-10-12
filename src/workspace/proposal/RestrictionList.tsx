import { useId } from 'react'
import { fmtDate } from '@/kit/measure'
import type { RepurchaseRestriction } from '@/services/oms'
import { restrictionSource } from './restriction-words'

export function RestrictionList({ restrictions }: { restrictions: RepurchaseRestriction[] }) {
  const titleId = useId()
  if (restrictions.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-1.5">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Repurchase restrictions · wash-sale taxpayer</h3>
      <ul className="flex flex-col gap-1 text-body">
        {restrictions.map((r) => (
          <li key={`${r.symbol}:${r.source.kind}:${r.until}`} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{r.symbol}</span>
            <span className="tabular">{`no repurchase through ${fmtDate(r.until)}`}</span>
            <span className="text-ink-3">{restrictionSource(r)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
