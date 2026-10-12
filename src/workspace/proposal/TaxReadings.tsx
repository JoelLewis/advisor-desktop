import { Reading } from '@/kit/reading/Reading'
import { fmtMoney, fmtResult } from '@/kit/measure'
import { taxEstimateDirection } from '@/lib/capital-gains'
import type { ProposalTaxSummary } from '@/types/workspace-proposal'

export function TaxReadings({ summary, currency }: { summary: ProposalTaxSummary; currency: string }) {
  const estimate = taxEstimateDirection(summary.netTax)
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-3">
      <Reading label="Sold" value={fmtMoney(summary.sold)} unit={currency} />
      <Reading label="Bought" value={fmtMoney(summary.bought)} unit={currency} />
      <Reading label="Gains realised" value={fmtResult(summary.gains)} unit={currency} />
      <Reading label="Losses realised" value={fmtResult(summary.losses)} unit={currency} />
      {summary.washed !== 0 ? <Reading label="Washed" value={fmtResult(summary.washed)} unit={currency} /> : null}
      <Reading label={`Est. tax ${estimate.direction} the return`} value={fmtMoney(estimate.amount)} unit={currency} />
    </div>
  )
}
