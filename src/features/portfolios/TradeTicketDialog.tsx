import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { useSubmitTrade } from '@/hooks/use-orders'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

type TradeTicketDialogProps = {
  open: boolean
  onClose: () => void
  accountId: string
  accountName: string
  prefill?: {
    symbol?: string
    side?: 'buy' | 'sell'
    quantity?: number
  }
}

export function TradeTicketDialog({
  open,
  onClose,
  accountId,
  accountName,
  prefill,
}: TradeTicketDialogProps) {
  const [symbol, setSymbol] = useState(prefill?.symbol ?? '')
  const [side, setSide] = useState<'buy' | 'sell'>(prefill?.side ?? 'buy')
  const [quantity, setQuantity] = useState(prefill?.quantity?.toString() ?? '')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const trade = useSubmitTrade()

  // Sync prefill when dialog opens
  useEffect(() => {
    if (open) {
      setSymbol(prefill?.symbol ?? '')
      setSide(prefill?.side ?? 'buy')
      setQuantity(prefill?.quantity?.toString() ?? '')
      setOrderType('market')
      setLimitPrice('')
      setSubmitted(false)
      trade.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trade.reset is stable, including trade object would cause infinite loop
  }, [open, prefill?.symbol, prefill?.side, prefill?.quantity])

  // Auto-close after successful submission
  useEffect(() => {
    if (!submitted) return

    const timer = setTimeout(() => {
      onClose()
    }, 1500)

    return () => clearTimeout(timer)
  }, [submitted, onClose])

  const parsedQuantity = Number(quantity)
  const parsedLimitPrice = Number(limitPrice)

  const isValid =
    symbol.trim().length > 0 &&
    parsedQuantity > 0 &&
    (orderType === 'market' || parsedLimitPrice > 0)

  const handleSubmit = useCallback(() => {
    if (!isValid || trade.isPending) return

    trade.mutate(
      {
        accountId,
        symbol: symbol.trim().toUpperCase(),
        side,
        quantity: parsedQuantity,
        orderType,
        limitPrice: orderType === 'limit' ? parsedLimitPrice : undefined,
      },
      {
        onSuccess: () => setSubmitted(true),
      },
    )
  }, [
    isValid,
    trade,
    accountId,
    symbol,
    side,
    parsedQuantity,
    orderType,
    parsedLimitPrice,
  ])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div>
            <DialogTitle className="text-section-header">Trade Ticket</DialogTitle>
            <DialogDescription>{accountName}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {/* Success banner */}
          {submitted && (
            <div className="flex items-center gap-2 rounded-md bg-accent-green/10 px-3 py-2 text-body text-accent-green" role="status">
              <Check className="h-4 w-4 flex-shrink-0" />
              Order submitted
            </div>
          )}

          {/* Error banner */}
          {trade.isError && (
            <div className="flex items-center gap-2 rounded-md bg-accent-red/10 px-3 py-2 text-body text-accent-red" role="alert">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {trade.error instanceof Error
                ? trade.error.message
                : 'Failed to submit order'}
            </div>
          )}

          {/* Symbol */}
          <div className="space-y-1.5">
            <label htmlFor="trade-symbol" className="text-caption font-medium text-text-secondary">
              Symbol
            </label>
            <input
              id="trade-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
              disabled={submitted}
            />
          </div>

          {/* Side */}
          <fieldset className="space-y-1.5">
            <legend className="text-caption font-medium text-text-secondary">Side</legend>
            <div className="flex gap-2">
              <button
                onClick={() => setSide('buy')}
                disabled={submitted}
                aria-pressed={side === 'buy'}
                className={cn(
                  'flex-1 rounded-md px-4 py-2 text-body font-medium transition-colors',
                  side === 'buy'
                    ? 'bg-accent-green text-white'
                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80',
                )}
              >
                Buy
              </button>
              <button
                onClick={() => setSide('sell')}
                disabled={submitted}
                aria-pressed={side === 'sell'}
                className={cn(
                  'flex-1 rounded-md px-4 py-2 text-body font-medium transition-colors',
                  side === 'sell'
                    ? 'bg-accent-red text-white'
                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80',
                )}
              >
                Sell
              </button>
            </div>
          </fieldset>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label htmlFor="trade-quantity" className="text-caption font-medium text-text-secondary">
              Quantity
            </label>
            <input
              id="trade-quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min={1}
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
              disabled={submitted}
            />
          </div>

          {/* Order Type */}
          <fieldset className="space-y-1.5">
            <legend className="text-caption font-medium text-text-secondary">Order Type</legend>
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('market')}
                disabled={submitted}
                aria-pressed={orderType === 'market'}
                className={cn(
                  'flex-1 rounded-md px-4 py-2 text-body font-medium transition-colors',
                  orderType === 'market'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80',
                )}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                disabled={submitted}
                aria-pressed={orderType === 'limit'}
                className={cn(
                  'flex-1 rounded-md px-4 py-2 text-body font-medium transition-colors',
                  orderType === 'limit'
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80',
                )}
              >
                Limit
              </button>
            </div>
          </fieldset>

          {/* Limit Price (conditional) */}
          {orderType === 'limit' && (
            <div className="space-y-1.5">
              <label htmlFor="trade-limit-price" className="text-caption font-medium text-text-secondary">
                Limit Price
              </label>
              <input
                id="trade-limit-price"
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                min={0.01}
                step={0.01}
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
                disabled={submitted}
              />
            </div>
          )}

          {/* Summary badge */}
          {symbol.trim() && parsedQuantity > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-surface-secondary px-3 py-2">
              <Badge variant={side === 'buy' ? 'green' : 'red'}>
                {side.toUpperCase()}
              </Badge>
              <span className="font-mono text-body text-text-primary">
                {parsedQuantity}
              </span>
              <span className="font-mono text-body font-medium text-text-primary">
                {symbol.trim().toUpperCase()}
              </span>
              <span className="text-caption text-text-tertiary">
                @ {orderType === 'limit' ? `Limit $${limitPrice || '—'}` : 'Market'}
              </span>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || trade.isPending || submitted}
            className={cn(
              'w-full rounded-md px-4 py-2 text-body font-medium text-white transition-colors',
              isValid && !trade.isPending && !submitted
                ? 'bg-accent-blue hover:bg-accent-blue/90'
                : 'cursor-not-allowed bg-accent-blue/50',
            )}
          >
            {trade.isPending ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
