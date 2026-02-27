import { FieldGroup, ToggleButton, TradeInput } from './shared'
import { formatCurrency } from '@/lib/utils'
import type { DigitalAssetSide, DigitalAssetOrderType, TimeInForce, SymbolSearchResult } from '@/types/trading'

type DigitalAssetTradeFieldsProps = {
  side: DigitalAssetSide
  onSideChange: (s: DigitalAssetSide) => void
  amountType: 'units' | 'dollars'
  onAmountTypeChange: (t: 'units' | 'dollars') => void
  quantity: string
  onQuantityChange: (v: string) => void
  orderType: DigitalAssetOrderType
  onOrderTypeChange: (t: DigitalAssetOrderType) => void
  limitPrice: string
  onLimitPriceChange: (v: string) => void
  timeInForce: TimeInForce
  onTimeInForceChange: (t: TimeInForce) => void
  selectedSymbol: SymbolSearchResult | null
  disabled?: boolean
}

const BLUE_ACTIVE = 'border-accent-blue bg-accent-blue/10 text-accent-blue'

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return formatCurrency(n)
}

export function DigitalAssetTradeFields({
  side, onSideChange,
  amountType, onAmountTypeChange,
  quantity, onQuantityChange,
  orderType, onOrderTypeChange,
  limitPrice, onLimitPriceChange,
  timeInForce, onTimeInForceChange,
  selectedSymbol,
  disabled,
}: DigitalAssetTradeFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Side */}
      <FieldGroup label="Side">
        <div className="flex gap-2">
          <ToggleButton label="Buy" active={side === 'buy'} activeClass="border-accent-green bg-accent-green/10 text-accent-green" onClick={() => onSideChange('buy')} disabled={disabled} />
          <ToggleButton label="Sell" active={side === 'sell'} activeClass="border-accent-red bg-accent-red/10 text-accent-red" onClick={() => onSideChange('sell')} disabled={disabled} />
        </div>
      </FieldGroup>

      {/* Market data card */}
      {selectedSymbol && selectedSymbol.volume24h != null && (
        <div className="rounded-md border border-border-primary bg-surface-secondary p-3">
          <div className="mb-1 text-caption font-semibold text-text-secondary">Market Data (24h)</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-caption">
            <div className="flex justify-between">
              <span className="text-text-secondary">Price</span>
              <span className="font-mono font-medium">{formatCurrency(selectedSymbol.lastPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">24h Change</span>
              <span className={`font-mono font-medium ${selectedSymbol.changePct >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {selectedSymbol.changePct >= 0 ? '+' : ''}{selectedSymbol.changePct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">24h Volume</span>
              <span className="font-mono font-medium">{formatLargeNumber(selectedSymbol.volume24h)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Market Cap</span>
              <span className="font-mono font-medium">{selectedSymbol.marketCap ? formatLargeNumber(selectedSymbol.marketCap) : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Amount type */}
      <FieldGroup label="Amount Type">
        <div className="flex gap-2">
          <ToggleButton label="Units" active={amountType === 'units'} activeClass={BLUE_ACTIVE} onClick={() => onAmountTypeChange('units')} disabled={disabled} />
          <ToggleButton label="Dollar Amount" active={amountType === 'dollars'} activeClass={BLUE_ACTIVE} onClick={() => onAmountTypeChange('dollars')} disabled={disabled} />
        </div>
      </FieldGroup>

      {/* Quantity */}
      <FieldGroup label={amountType === 'units' ? 'Quantity (fractional allowed)' : 'Dollar Amount'} htmlFor="da-qty">
        <TradeInput
          id="da-qty"
          value={quantity}
          onChange={onQuantityChange}
          placeholder={amountType === 'units' ? '0.000000' : '$0.00'}
          min={amountType === 'units' ? 0.000001 : 0.01}
          step={amountType === 'units' ? 0.000001 : 0.01}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Order type */}
      <FieldGroup label="Order Type">
        <div className="flex gap-2">
          <ToggleButton label="Market" active={orderType === 'market'} activeClass={BLUE_ACTIVE} onClick={() => onOrderTypeChange('market')} disabled={disabled} />
          <ToggleButton label="Limit" active={orderType === 'limit'} activeClass={BLUE_ACTIVE} onClick={() => onOrderTypeChange('limit')} disabled={disabled} />
        </div>
      </FieldGroup>

      {orderType === 'limit' && (
        <FieldGroup label="Limit Price" htmlFor="da-limit">
          <TradeInput id="da-limit" value={limitPrice} onChange={onLimitPriceChange} placeholder="$0.00" min={0.01} step={0.01} disabled={disabled} />
        </FieldGroup>
      )}

      {/* TIF */}
      <FieldGroup label="Time in Force">
        <div className="flex gap-2">
          <ToggleButton label="Day" active={timeInForce === 'day'} activeClass={BLUE_ACTIVE} onClick={() => onTimeInForceChange('day')} disabled={disabled} />
          <ToggleButton label="GTC" active={timeInForce === 'gtc'} activeClass={BLUE_ACTIVE} onClick={() => onTimeInForceChange('gtc')} disabled={disabled} />
          <ToggleButton label="IOC" active={timeInForce === 'ioc'} activeClass={BLUE_ACTIVE} onClick={() => onTimeInForceChange('ioc')} disabled={disabled} />
        </div>
      </FieldGroup>
    </div>
  )
}
