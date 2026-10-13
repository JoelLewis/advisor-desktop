import { useId } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { fmtMoney, fmtPrice, fmtQuantity, fmtTimestamp } from '@/kit/measure'
import { FILL_SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { Message } from '@/types/workspace'

type FillsMessage = Extract<Message, { kind: 'fills' }>

/** The execution report for released orders: each fill at the day's price, in the order it executed. */
export function FillsView({ message }: { message: FillsMessage }) {
  const titleId = useId()
  const currency = message.fills[0]?.currency ?? ''
  return (
    <article aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={titleId} className="text-body font-semibold">{`Fills · ${message.title} v${message.version}`}</h2>
        <span className="text-label uppercase text-ink-3">Execution</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-body text-ink-2">{`Released by ${message.releaseActId}; filled at the day's prices.`}</p>
      <DataTable caption={`Fills · v${message.version}`} rows={message.fills} getRowId={(f) => f.id} noun={{ singular: 'fill', plural: 'fills' }} density="dense"
        columns={[
          { id: 'symbol', header: 'Symbol', cell: (f) => f.symbol },
          { id: 'side', header: 'Side', cell: (f) => FILL_SIDE_WORDS[f.side] },
          { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (f) => <Num text={fmtQuantity(f.quantity)} /> },
          { id: 'price', header: 'Price', unit: currency, align: 'right', cell: (f) => fmtPrice(f.price) },
          { id: 'value', header: 'Value', unit: currency, align: 'right', cell: (f) => fmtMoney(f.value) },
          { id: 'at', header: 'Time', cell: (f) => fmtTimestamp(f.at) },
        ]} />
    </article>
  )
}
