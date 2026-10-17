import { fmtMoney, fmtQuantity } from '@/kit/measure'
import type { StagedOrder } from '@/types/workspace-proposal'
import { SIDE_WORDS } from './leg-status'

/** The orders staged for compliance, one line each. */
export function StagedOrderList({ orders }: { orders: StagedOrder[] }) {
  return (
    <ul aria-label="Orders pending compliance release" className="flex flex-col gap-1 text-body">
      {orders.map((o) => (
        <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span>{`${SIDE_WORDS[o.side]} ${fmtQuantity(o.quantity)} ${o.symbol}`}</span>
          <span className="tabular text-ink-2">{fmtMoney(o.estimatedValue)} <span className="text-ink-3">{o.currency}</span></span>
        </li>
      ))}
    </ul>
  )
}
