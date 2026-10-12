import { AlertTriangle, Calendar } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import type { OpenWashSaleWindow } from '@/mocks/data/realised-sales'

type WashSaleCalendarViewProps = {
  windows: OpenWashSaleWindow[]
}

export function WashSaleCalendarView({ windows }: WashSaleCalendarViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary" />
          {/* C10 · tax-loss-harvesting — 30 days before + the sale date + 30 days after. */}
          61-day wash sale windows
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-caption text-text-secondary">
          Opened by a realised loss sale by this account&rsquo;s taxpayer: the owner or their
          spouse, or the trust or entity itself. Repurchasing a substantially identical security
          inside the window, in any of their accounts, disallows the loss under IRC §1091: deferred
          into the new shares&rsquo; basis in a taxable account, lost for good in an IRA or Roth.
        </p>
        {windows.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary">
            No open wash sale windows for this taxpayer.
          </div>
        ) : (
          <div className="space-y-3">
            {windows.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between rounded-md border px-4 py-3',
                  item.daysRemaining <= 7 ? 'border-amber-300 bg-amber-50' : 'border-border-primary',
                )}
              >
                <div className="flex items-center gap-4">
                  {item.daysRemaining <= 7 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <div>
                    <p className="font-mono text-body-strong">{item.symbol}</p>
                    <p className="text-caption text-text-tertiary">
                      Sold {item.quantity.toLocaleString()} shares on {formatDate(item.saleDate)} ·
                      realised loss {formatCurrency(item.realisedGainLoss)} · {item.holdingPeriod}-term
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-caption text-text-secondary">
                    {formatDate(item.start)} — {formatDate(item.end)}
                  </p>
                  <p className={cn(
                    'font-mono text-caption font-medium',
                    item.daysRemaining <= 7 ? 'text-amber-600' : 'text-text-tertiary',
                  )}>
                    {item.daysRemaining}d remaining
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
