import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { useSubmitTrade, usePreTradeCheck } from '@/hooks/use-orders'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { TradableAssetClass, EquitySide, EquityOrderType, TimeInForce } from '@/types/trading'
import type { PreTradeViolation } from '@/services/oms'
import { AssetClassSelector } from './trade-fields/shared'
import { EquityTradeFields } from './trade-fields/EquityTradeFields'
import { PreTradeComplianceDisplay } from './trade-fields/ComplianceCheck'
import { validateTrade } from './trade-fields/validation'

type TradeTicketDialogProps = {
  open: boolean
  onClose: () => void
  accountId: string
  accountName: string
  prefill?: {
    symbol?: string
    side?: 'buy' | 'sell'
    quantity?: number
    assetClass?: TradableAssetClass
    price?: number
  }
}

/**
 * Auto-detect asset class from position asset class string.
 * Maps domain AssetClass values to TradableAssetClass.
 */
function detectAssetClass(ac?: string): TradableAssetClass {
  if (!ac) return 'equity'
  const lower = ac.toLowerCase()
  if (lower.includes('option')) return 'option'
  if (lower.includes('mutual') || lower.includes('fund')) return 'mutual_fund'
  if (lower.includes('fixed') || lower.includes('bond') || lower.includes('treasury')) return 'fixed_income'
  if (lower.includes('digital') || lower.includes('crypto')) return 'digital_asset'
  return 'equity'
}

export function TradeTicketDialog({
  open,
  onClose,
  accountId,
  accountName,
  prefill,
}: TradeTicketDialogProps) {
  const [assetClass, setAssetClass] = useState<TradableAssetClass>(prefill?.assetClass ?? 'equity')
  const [symbol, setSymbol] = useState(prefill?.symbol ?? '')
  const [side, setSide] = useState<EquitySide>((prefill?.side as EquitySide) ?? 'buy')
  const [quantity, setQuantity] = useState(prefill?.quantity?.toString() ?? '')
  const [orderType, setOrderType] = useState<EquityOrderType>('market')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day')
  const [extendedHours, setExtendedHours] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const trade = useSubmitTrade()
  const preCheck = usePreTradeCheck()
  const [compliancePassed, setCompliancePassed] = useState<boolean | null>(null)
  const [complianceViolations, setComplianceViolations] = useState<PreTradeViolation[]>([])
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync prefill when dialog opens
  useEffect(() => {
    if (open) {
      setAssetClass(prefill?.assetClass ?? detectAssetClass(prefill?.assetClass))
      setSymbol(prefill?.symbol ?? '')
      setSide((prefill?.side as EquitySide) ?? 'buy')
      setQuantity(prefill?.quantity?.toString() ?? '')
      setOrderType('market')
      setLimitPrice('')
      setStopPrice('')
      setTimeInForce('day')
      setExtendedHours(false)
      setSubmitted(false)
      setCompliancePassed(null)
      setComplianceViolations([])
      trade.reset()
      preCheck.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill?.symbol, prefill?.side, prefill?.quantity, prefill?.assetClass])

  // Debounced pre-trade compliance check
  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    const trimmed = symbol.trim()
    const qty = Number(quantity)
    if (!trimmed || qty <= 0 || !accountId) {
      setCompliancePassed(null)
      setComplianceViolations([])
      return
    }
    checkTimerRef.current = setTimeout(() => {
      preCheck.mutate(
        { accountId, symbol: trimmed, side, quantity: qty },
        {
          onSuccess: (result) => {
            setCompliancePassed(result.passed)
            setComplianceViolations(result.violations)
          },
        },
      )
    }, 500)
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, quantity, accountId])

  // Auto-close after successful submission
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(onClose, 1500)
    return () => clearTimeout(timer)
  }, [submitted, onClose])

  const parsedQuantity = Number(quantity)

  const isValid = validateTrade({
    assetClass,
    accountId,
    symbol: symbol.trim(),
    side,
    quantity: parsedQuantity,
    orderType,
    limitPrice: Number(limitPrice) || undefined,
    stopPrice: Number(stopPrice) || undefined,
  })

  const handleSubmit = useCallback(() => {
    if (!isValid || trade.isPending) return

    trade.mutate(
      {
        accountId,
        symbol: symbol.trim().toUpperCase(),
        side,
        quantity: parsedQuantity,
        orderType,
        limitPrice: (orderType === 'limit' || orderType === 'stop_limit') ? Number(limitPrice) : undefined,
        stopPrice: (orderType === 'stop' || orderType === 'stop_limit') ? Number(stopPrice) : undefined,
        assetClass,
        timeInForce,
        extendedHours,
      },
      {
        onSuccess: () => setSubmitted(true),
      },
    )
  }, [isValid, trade, accountId, symbol, side, parsedQuantity, orderType, limitPrice, stopPrice, assetClass, timeInForce, extendedHours])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
              {trade.error instanceof Error ? trade.error.message : 'Failed to submit order'}
            </div>
          )}

          {/* Asset class selector (compact) */}
          <AssetClassSelector value={assetClass} onChange={setAssetClass} compact />

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
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
              disabled={submitted}
            />
          </div>

          {/* Equity fields — reuse the component for the full experience */}
          {assetClass === 'equity' && (
            <EquityTradeFields
              side={side} onSideChange={setSide}
              quantity={quantity} onQuantityChange={setQuantity}
              orderType={orderType} onOrderTypeChange={setOrderType}
              limitPrice={limitPrice} onLimitPriceChange={setLimitPrice}
              stopPrice={stopPrice} onStopPriceChange={setStopPrice}
              timeInForce={timeInForce} onTimeInForceChange={setTimeInForce}
              extendedHours={extendedHours} onExtendedHoursChange={setExtendedHours}
              disabled={submitted}
            />
          )}

          {/* Non-equity: simplified inline fields (dialog is a quick-trade surface) */}
          {assetClass !== 'equity' && (
            <>
              <fieldset className="space-y-1.5">
                <legend className="text-caption font-medium text-text-secondary">Side</legend>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSide('buy')}
                    disabled={submitted}
                    aria-pressed={side === 'buy'}
                    className={cn(
                      'flex-1 rounded-md px-4 py-2 text-body font-medium transition-colors',
                      side === 'buy' ? 'bg-accent-green text-white' : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80',
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
                      side === 'sell' ? 'bg-accent-red text-white' : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80',
                    )}
                  >
                    Sell
                  </button>
                </div>
              </fieldset>

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
                  min={assetClass === 'digital_asset' ? 0.000001 : 1}
                  step={assetClass === 'digital_asset' ? 0.000001 : 1}
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-body text-text-primary focus:border-accent-blue focus:outline-hidden focus:ring-1 focus:ring-accent-blue"
                  disabled={submitted}
                />
              </div>
            </>
          )}

          {/* Summary badge */}
          {symbol.trim() && parsedQuantity > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-surface-secondary px-3 py-2">
              <Badge variant={['buy', 'buy_to_open', 'buy_to_cover', 'purchase'].includes(side) ? 'green' : 'red'}>
                {side.replace(/_/g, ' ').toUpperCase()}
              </Badge>
              <span className="font-mono text-body text-text-primary">{parsedQuantity}</span>
              <span className="font-mono text-body font-medium text-text-primary">{symbol.trim().toUpperCase()}</span>
              <span className="text-caption text-text-tertiary">@ {orderType === 'limit' ? `Limit $${limitPrice || '—'}` : 'Market'}</span>
            </div>
          )}

          {/* Pre-trade compliance results */}
          <PreTradeComplianceDisplay
            violations={complianceViolations}
            isChecking={preCheck.isPending}
            passed={compliancePassed}
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || trade.isPending || submitted || compliancePassed === false}
            className={cn(
              'w-full rounded-md px-4 py-2 text-body font-medium text-white transition-colors',
              isValid && !trade.isPending && !submitted && compliancePassed !== false
                ? 'bg-accent-blue hover:bg-accent-blue/90'
                : 'cursor-not-allowed bg-accent-blue/50',
            )}
          >
            {trade.isPending ? 'Submitting...' : compliancePassed === false ? 'Blocked by Compliance' : 'Submit Order'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
