import { cn } from '@/lib/utils'
import { fmtMoney, fmtResult, isNegative } from '@/kit/measure'

type TaxTapeProps = {
  gains: number; losses: number; netShortTerm: number; netLongTerm: number
  grossTax: number; netTax: number; scope: string; rateBasis: string
}

function Line({ label, value, indent, strong }: { label: string; value: string; indent?: boolean; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', indent && 'pl-3 text-ink-2')}>
      <span className="text-body">{label}</span>
      <span className="inline-flex items-baseline gap-1.5">
        <span className={cn('tabular text-table', (strong || isNegative(value)) && 'font-semibold')}>{value}</span>
        <span className="text-label text-ink-3">USD</span>
      </span>
    </div>
  )
}

export function TaxTape({ gains, losses, netShortTerm, netLongTerm, grossTax, netTax, scope, rateBasis }: TaxTapeProps) {
  return (
    <section aria-label="Tax effect estimate" className="border border-ink bg-face p-4">
      <Line label="Gains realized" value={fmtResult(gains)} />
      <Line label="Losses realized" value={fmtResult(losses)} />
      <Line label="Net, long-term" value={fmtResult(netLongTerm)} indent />
      <Line label="Net, short-term" value={fmtResult(netShortTerm)} indent />
      <div className="my-2 border-t border-ink" />
      <Line label="Tax on gains before netting" value={fmtMoney(grossTax)} />
      <Line label="Reduced by netting the losses" value={fmtResult(netTax - grossTax)} />
      <div className="my-2 border-t-2 border-ink" />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body font-semibold">Estimated net tax</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="tabular text-total stretch-wide">{fmtMoney(netTax)}</span>
          <span className="text-label text-ink-3">USD</span>
        </span>
      </div>
      <p className="mt-3 text-label normal-case text-ink-3">{scope}</p>
      <p className="text-label normal-case text-ink-3">{rateBasis}</p>
    </section>
  )
}
