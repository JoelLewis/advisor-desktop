import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type ExecuteConfirmationStepProps = {
  selectedIds: Set<string>
  totalTrades: number
  executeMutation: { data?: { accountId: string; status: string; ordersCreated: number }[] }
  accounts: { id: string; name: string }[] | undefined
  navigate: (path: string) => void
}

export function ExecuteConfirmationStep({
  selectedIds,
  totalTrades,
  executeMutation,
  accounts,
  navigate,
}: ExecuteConfirmationStepProps) {
  return (
    <div className="space-y-4">
      <Card className="border-l-[3px] border-l-accent-green">
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-accent-green" />
          <h2 className="mt-4 text-section-header">Rebalance Orders Submitted</h2>
          <p className="mt-2 text-body text-text-secondary">
            {selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''} rebalanced with {totalTrades} total trades.
          </p>
          {executeMutation.data && (
            <div className="mx-auto mt-4 max-w-md space-y-2">
              {executeMutation.data.map((result) => {
                const acc = accounts?.find((a) => a.id === result.accountId)
                return (
                  <div key={result.accountId} className="flex items-center justify-between rounded border border-border-primary px-4 py-2 text-caption">
                    <span>{acc?.name ?? result.accountId}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="green">{result.status}</Badge>
                      <span className="text-text-secondary">{result.ordersCreated} orders</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <button
            onClick={() => navigate('/portfolios')}
            className="mt-6 rounded bg-accent-blue px-4 py-2 text-body font-medium text-white hover:bg-accent-blue/90"
          >
            Return to Portfolios
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
