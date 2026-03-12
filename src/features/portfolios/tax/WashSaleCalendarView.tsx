import { AlertTriangle, Calendar } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { formatDate, cn } from '@/lib/utils'
import type { TaxLot } from '@/types/portfolio'
import { MOCK_NOW } from './shared'

type WashSaleWindow = TaxLot & {
  washSaleStart: string
  washSaleEnd: string
  position: { symbol: string; name: string } | undefined
}

type WashSaleCalendarViewProps = {
  washSaleWindows: WashSaleWindow[]
}

export function WashSaleCalendarView({ washSaleWindows }: WashSaleCalendarViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-secondary" />
          30-Day Wash Sale Windows
        </div>
      </CardHeader>
      <CardContent>
        {washSaleWindows.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary">No active wash sale windows</div>
        ) : (
          <div className="space-y-3">
            {washSaleWindows.map((item) => {
              const daysRemaining = Math.max(0, Math.ceil(
                (new Date(item.washSaleEnd).getTime() - new Date(MOCK_NOW).getTime()) / (1000 * 60 * 60 * 24),
              ))
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-4 py-3',
                    daysRemaining <= 7 ? 'border-amber-300 bg-amber-50' : 'border-border-primary',
                  )}
                >
                  <div className="flex items-center gap-4">
                    {daysRemaining <= 7 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                    <div>
                      <p className="font-mono text-body-strong">{item.position?.symbol ?? 'Unknown'}</p>
                      <p className="text-caption text-text-tertiary">
                        Purchased {formatDate(item.purchaseDate)} &middot; {item.quantity.toLocaleString()} shares
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-caption text-text-secondary">
                      {formatDate(item.washSaleStart)} — {formatDate(item.washSaleEnd)}
                    </p>
                    <p className={cn(
                      'font-mono text-caption font-medium',
                      daysRemaining <= 7 ? 'text-amber-600' : 'text-text-tertiary',
                    )}>
                      {daysRemaining}d remaining
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
