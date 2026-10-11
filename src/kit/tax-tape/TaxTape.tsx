import { cn } from '@/lib/utils'
import { MeasureError, UNIT, fmtMoney, fmtResult, isNegative } from '@/kit/measure'

type TaxTapeProps = {
  gains: number; losses: number; netShortTerm: number; netLongTerm: number
  grossTax: number; netTax: number; scope: string; rateBasis: string
}

const RECONCILIATION_TOLERANCE_USD = 1

type RuleAbove = 'none' | 'rule' | 'ink' | 'heavy'

const RULE_ABOVE: Record<RuleAbove, string> = {
  none: '',
  rule: 'border-t border-rule',
  ink: 'mt-2 border-t border-ink pt-2',
  heavy: 'mt-2 border-t-2 border-ink pt-2',
}

function Line({ label, value, subItem, ruleAbove = 'none' }: { label: string; value: string; subItem?: boolean; ruleAbove?: RuleAbove }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', RULE_ABOVE[ruleAbove], subItem && 'pl-3 text-ink-2')}>
      <dt className="text-body">
        {subItem ? <span className="sr-only">of which </span> : null}
        {label}
      </dt>
      <dd className="inline-flex items-baseline gap-1.5">
        <span className={cn('tabular text-table', isNegative(value) && 'font-semibold')}>{value}</span>
        <span className="text-label text-ink-3">{UNIT.usd}</span>
      </dd>
    </div>
  )
}

function assertReconciles({ gains, losses, netShortTerm, netLongTerm }: TaxTapeProps): void {
  const gap = Math.abs(gains + losses - (netShortTerm + netLongTerm))
  if (gap > RECONCILIATION_TOLERANCE_USD) {
    throw new MeasureError(`Tax tape does not reconcile: gains + losses differs from net short + long by ${gap}`)
  }
}

export function TaxTape(props: TaxTapeProps) {
  assertReconciles(props)
  const { gains, losses, netShortTerm, netLongTerm, grossTax, netTax, scope, rateBasis } = props
  return (
    <section aria-label="Tax effect estimate" className="border border-ink bg-face p-4">
      <dl>
        <Line label="Gains realized" value={fmtResult(gains)} />
        <Line label="Losses realized" value={fmtResult(losses)} />
        <Line label="Net realized" value={fmtResult(gains + losses)} ruleAbove="rule" />
        <Line label="Net, long-term" value={fmtResult(netLongTerm)} subItem />
        <Line label="Net, short-term" value={fmtResult(netShortTerm)} subItem />
        <Line label="Tax on gains before netting" value={fmtMoney(grossTax)} ruleAbove="ink" />
        <Line label="Reduced by netting the losses" value={fmtResult(netTax - grossTax)} />
        <div className={cn('flex items-baseline justify-between gap-4', RULE_ABOVE.heavy)}>
          <dt className="text-body font-semibold">Estimated net tax</dt>
          <dd className="inline-flex items-baseline gap-1.5">
            <span className="tabular text-total stretch-wide">{fmtMoney(netTax)}</span>
            <span className="text-label text-ink-3">{UNIT.usd}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-label normal-case text-ink-3">{scope}</p>
      <p className="text-label normal-case text-ink-3">{rateBasis}</p>
    </section>
  )
}
