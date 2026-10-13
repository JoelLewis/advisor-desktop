import { fmtMoney, fmtPrice, fmtQuantity, fmtTimestamp } from '@/kit/measure'
import type { Fill } from '@/types/workspace-proposal'
import { FILL_SIDE_WORDS } from './leg-status'

/** The fills a release produced, one line each; `withTime` adds when each filled. */
export function FillList({ fills, label, withTime = false }: { fills: Fill[]; label: string; withTime?: boolean }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-1 text-body">
      {fills.map((f) => (
        <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span>{`${FILL_SIDE_WORDS[f.side]} ${fmtQuantity(f.quantity)} ${f.symbol} at ${fmtPrice(f.price)}`}</span>
          <span className="tabular text-ink-2">
            {fmtMoney(f.value)} <span className="text-ink-3">{f.currency}</span>
            {withTime ? ` · ${fmtTimestamp(f.at)}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
