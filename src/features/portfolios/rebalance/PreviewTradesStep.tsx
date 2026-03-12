import { Loader2, Shield } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import type { RebalancePreview } from '@/services/oms'
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
  return (
    <div className="space-y-4">
      {previews.map((preview) => {
        const acc = accounts?.find((a) => a.id === preview.accountId)
        return (
          <Card key={preview.accountId}>
            <CardHeader action={
              <span className="font-mono text-caption text-text-secondary">
                {preview.trades.length} trades &middot; Tax impact: {formatWithConversion(preview.estimatedTaxImpact, 'USD', { compact: true })}
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
                      <td className="py-2 text-right font-mono">{formatWithConversion(trade.estimatedValue, 'USD', { compact: true })}</td>
                      <td className={cn('py-2 text-right font-mono', trade.taxImpact > 0 ? 'text-accent-red' : 'text-text-secondary')}>
                        {trade.taxImpact > 0 ? formatWithConversion(trade.taxImpact, 'USD', { compact: true }) : '\u2014'}
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

      <div className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-tertiary p-4">
        <div className="flex items-center gap-6 text-body">
          <span><strong>{totalTrades}</strong> total trades</span>
          <span>Tax impact: <strong className="font-mono text-accent-red">{formatWithConversion(totalTaxImpact, 'USD', { compact: true })}</strong></span>
        </div>
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
