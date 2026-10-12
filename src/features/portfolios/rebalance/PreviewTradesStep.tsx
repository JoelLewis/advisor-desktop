import { Loader2, Shield } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import { CAPITAL_LOSS_SCOPE_NOTE, taxEstimateDirection } from '@/lib/capital-gains'
import type { ProposedTrade, RebalancePreview } from '@/services/oms'
import type { WizardStep } from './types'

type PreviewTradesStepProps = {
  previews: RebalancePreview[]
  accounts: { id: string; name: string }[] | undefined
  formatWithConversion: ReturnType<typeof useFormatCurrency>['formatWithConversion']
  totalTrades: number
  totalTaxImpact: number
  complianceMutation: { isPending: boolean }
  handleReviewCompliance: () => void
  setStep: (step: WizardStep) => void
}

type RealisedResultProps = {
  trade: ProposedTrade
  taxable: boolean
  formatWithConversion: PreviewTradesStepProps['formatWithConversion']
}

type TaxEstimateProps = {
  preview: RebalancePreview
  accountName: (accountId: string) => string
  formatWithConversion: PreviewTradesStepProps['formatWithConversion']
}

/**
 * States what the estimate nets: this proposal, the year-to-date realised results on the owner's
 * return, and any earlier account in the batch on that return — never another taxpayer's results.
 * An IRA or Roth is on no current return, so it makes no capital-gains claim at all.
 */
function TaxEstimate({ preview, accountName, formatWithConversion }: TaxEstimateProps) {
  const ytd = preview.ytdRealisedOnReturn
  if (!preview.taxable || ytd === null) return <>Not taxed in this account</>
  const money = (n: number) => formatWithConversion(n, preview.currency, { compact: true })
  const ytdParts = [
    ytd.shortTerm !== 0 && `ST ${money(ytd.shortTerm)}`,
    ytd.longTerm !== 0 && `LT ${money(ytd.longTerm)}`,
  ].filter(Boolean)
  const earlier = preview.nettedWithAccountIds.map(accountName)
  const { direction, amount } = taxEstimateDirection(preview.estimatedTaxImpact)
  return (
    <>
      Est. tax {direction} the return: {money(amount)}
      {' '}&middot; nets this proposal with YTD realised results on the same tax return ({ytdParts.length > 0 ? ytdParts.join(', ') : 'none'})
      {earlier.length > 0 && ` and with ${earlier.join(', ')} above`}
      {/* The legs' own tax on gains, nothing netted. Not a cap: the estimate can exceed it when
          the proposal's gains use up a loss that was sheltering other gains on the return. */}
      {' '}&middot; Tax on its gains before netting: {money(preview.grossTaxOnGains)}
    </>
  )
}

/**
 * A buy realises nothing, and neither does a sale inside an IRA or Roth — there the realised
 * fields are 0 because nothing is taxed, not because the sale broke even, so both read as a dash.
 * A taxable sale that genuinely realises zero shows the bare amount, without calling it a gain.
 */
function RealisedResult({ trade, taxable, formatWithConversion }: RealisedResultProps) {
  if (trade.side === 'buy' || !taxable) return <span className="text-text-secondary">{'\u2014'}</span>
  const realised = trade.realisedShortTerm + trade.realisedLongTerm
  const amount = formatWithConversion(Math.abs(realised), trade.currency, { compact: true })
  if (realised < 0) return <span className="text-accent-green">Harvested loss {amount}</span>
  if (realised === 0) return <span className="text-text-secondary">{amount}</span>
  return <span className="text-text-secondary">Gain {amount}</span>
}

export function PreviewTradesStep({
  previews,
  accounts,
  formatWithConversion,
  totalTrades,
  totalTaxImpact,
  complianceMutation,
  handleReviewCompliance,
  setStep,
}: PreviewTradesStepProps) {
  const total = taxEstimateDirection(totalTaxImpact)
  return (
    <div className="space-y-4">
      {previews.map((preview) => {
        const acc = accounts?.find((a) => a.id === preview.accountId)
        return (
          <Card key={preview.accountId}>
            <CardHeader action={
              <span className="font-mono text-caption text-text-secondary">
                {preview.trades.length} trades &middot;{' '}
                <TaxEstimate
                  preview={preview}
                  accountName={(id) => accounts?.find((a) => a.id === id)?.name ?? id}
                  formatWithConversion={formatWithConversion}
                />
              </span>
            }>
              {acc?.name ?? preview.accountId}
            </CardHeader>
            <CardContent>
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-border-primary text-left text-text-secondary">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Side</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Est. Value</th>
                    <th className="pb-2 text-right">Realised</th>
                    <th className="pb-2 text-right">Tax Impact</th>
                    <th className="pb-2">Wash Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.trades.map((trade) => (
                    <tr key={trade.symbol} className="border-b border-border-primary last:border-0">
                      <td className="py-2 font-mono font-medium">{trade.symbol}</td>
                      <td className="py-2 text-text-secondary">{trade.name}</td>
                      <td className="py-2">
                        <Badge variant={trade.side === 'buy' ? 'green' : 'red'}>{trade.side}</Badge>
                      </td>
                      <td className="py-2 text-right font-mono">{trade.quantity.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono">{formatWithConversion(trade.estimatedValue, trade.currency, { compact: true })}</td>
                      <td className="py-2 text-right font-mono">
                        <RealisedResult trade={trade} taxable={preview.taxable} formatWithConversion={formatWithConversion} />
                      </td>
                      <td className={cn('py-2 text-right font-mono', trade.taxImpact > 0 ? 'text-accent-red' : 'text-text-secondary')}>
                        {trade.taxImpact > 0 ? formatWithConversion(trade.taxImpact, trade.currency, { compact: true }) : '\u2014'}
                      </td>
                      <td className="py-2">
                        {trade.washSaleRisk && (
                          <Badge variant="yellow">Risk</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      })}

      <div className="rounded-lg border border-border-primary bg-surface-tertiary p-4">
        <div className="flex items-center gap-6 text-body">
          <span><strong>{totalTrades}</strong> total trades</span>
          {/* §9.3 — `totalTaxImpact` sums across previews that may carry different account
              currencies; RebalancePage converts each preview's own-currency figure to USD before
              summing (Global Constraint 2's one conversion boundary), so this really is USD by the
              time it reaches this prop — not a leftover unconverted literal. Accounts on one return
              are netted in batch order, each against the ones above it, so the sum is the tax the
              batch adds to (or saves on) the returns it touches, with no YTD loss counted twice. */}
          <span>
            Est. tax {total.direction === 'saved on' ? 'saved' : 'added'}, sum of account estimates:{' '}
            <strong className={cn('font-mono', total.direction === 'saved on' ? 'text-accent-green' : 'text-accent-red')}>
              {formatWithConversion(total.amount, 'USD', { compact: true })}
            </strong>
          </span>
        </div>
        <p className="mt-2 text-caption text-text-tertiary">{CAPITAL_LOSS_SCOPE_NOTE}</p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep('select')} className="rounded border border-border-secondary px-4 py-2 text-body text-text-secondary hover:bg-surface-tertiary">
          Back
        </button>
        <button
          onClick={handleReviewCompliance}
          disabled={complianceMutation.isPending}
          className="flex items-center gap-2 rounded bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
        >
          {complianceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Shield className="h-4 w-4" />
          Review Compliance
        </button>
      </div>
    </div>
  )
}
