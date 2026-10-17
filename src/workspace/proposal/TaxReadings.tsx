import { Reading } from '@/kit/reading/Reading'
import { fmtMoney, fmtResult } from '@/kit/measure'
import { taxEstimateDirection } from '@/lib/capital-gains'
import type { ProposalTaxSummary } from '@/types/workspace-proposal'

const TAX_LABEL = { 'added to': 'Est. additional tax', 'saved on': 'Est. tax saved' } as const

export function TaxReadings({ summary, currency }: { summary: ProposalTaxSummary; currency: string }) {
  const estimate = taxEstimateDirection(summary.netTax)
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-3">
      <Reading label="Sold" value={fmtMoney(summary.sold)} unit={currency} />
      <Reading label="Bought" value={fmtMoney(summary.bought)} unit={currency} />
      <Reading label="Gains realized" value={fmtResult(summary.gains)} unit={currency} />
      <Reading label="Losses realized" value={fmtResult(summary.losses)} unit={currency} />
      {summary.washed !== 0 ? <Reading label="Washed" value={fmtResult(summary.washed)} unit={currency} /> : null}
      <Reading label={TAX_LABEL[estimate.direction]} value={fmtMoney(estimate.amount)} unit={currency} />
    </div>
  )
}
