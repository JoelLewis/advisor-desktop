import { FieldGroup, ToggleButton, TradeInput } from './shared'
import type { EquitySide, EquityOrderType, TimeInForce } from '@/types/trading'

type EquityTradeFieldsProps = {
  side: EquitySide
  onSideChange: (s: EquitySide) => void
  quantity: string
  onQuantityChange: (v: string) => void
  orderType: EquityOrderType
  onOrderTypeChange: (t: EquityOrderType) => void
  limitPrice: string
  onLimitPriceChange: (v: string) => void
  stopPrice: string
  onStopPriceChange: (v: string) => void
  timeInForce: TimeInForce
  onTimeInForceChange: (t: TimeInForce) => void
  extendedHours: boolean
  onExtendedHoursChange: (v: boolean) => void
  disabled?: boolean
}

const SIDES: { value: EquitySide; label: string; activeClass: string }[] = [
  { value: 'buy', label: 'Buy', activeClass: 'border-accent-green bg-accent-green/10 text-accent-green' },
  { value: 'sell', label: 'Sell', activeClass: 'border-accent-red bg-accent-red/10 text-accent-red' },
  { value: 'sell_short', label: 'Short', activeClass: 'border-accent-red bg-accent-red/10 text-accent-red' },
  { value: 'buy_to_cover', label: 'Cover', activeClass: 'border-accent-green bg-accent-green/10 text-accent-green' },
]

const ORDER_TYPES: { value: EquityOrderType; label: string }[] = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit' },
  { value: 'stop', label: 'Stop' },
  { value: 'stop_limit', label: 'Stop-Limit' },
]

const TIF_OPTIONS: { value: TimeInForce; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'gtc', label: 'GTC' },
  { value: 'ioc', label: 'IOC' },
  { value: 'fok', label: 'FOK' },
]

const BLUE_ACTIVE = 'border-accent-blue bg-accent-blue/10 text-accent-blue'

export function EquityTradeFields({
  side, onSideChange,
  quantity, onQuantityChange,
  orderType, onOrderTypeChange,
  limitPrice, onLimitPriceChange,
  stopPrice, onStopPriceChange,
  timeInForce, onTimeInForceChange,
  extendedHours, onExtendedHoursChange,
  disabled,
}: EquityTradeFieldsProps) {
  const showLimit = orderType === 'limit' || orderType === 'stop_limit'
  const showStop = orderType === 'stop' || orderType === 'stop_limit'

  return (
    <div className="space-y-4">
      <FieldGroup label="Side">
        <div className="flex gap-2">
          {SIDES.map((s) => (
            <ToggleButton key={s.value} label={s.label} active={side === s.value} activeClass={s.activeClass} onClick={() => onSideChange(s.value)} disabled={disabled} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Quantity (shares)" htmlFor="eq-qty">
        <TradeInput id="eq-qty" value={quantity} onChange={onQuantityChange} placeholder="0" min={1} step={1} disabled={disabled} />
      </FieldGroup>

      <FieldGroup label="Order Type">
        <div className="flex gap-2">
          {ORDER_TYPES.map((t) => (
            <ToggleButton key={t.value} label={t.label} active={orderType === t.value} activeClass={BLUE_ACTIVE} onClick={() => onOrderTypeChange(t.value)} disabled={disabled} />
          ))}
        </div>
      </FieldGroup>

      {showLimit && (
        <FieldGroup label="Limit Price" htmlFor="eq-limit">
          <TradeInput id="eq-limit" value={limitPrice} onChange={onLimitPriceChange} placeholder="$0.00" min={0.01} step={0.01} disabled={disabled} />
        </FieldGroup>
      )}

      {showStop && (
        <FieldGroup label="Stop Price" htmlFor="eq-stop">
          <TradeInput id="eq-stop" value={stopPrice} onChange={onStopPriceChange} placeholder="$0.00" min={0.01} step={0.01} disabled={disabled} />
        </FieldGroup>
      )}

      <FieldGroup label="Time in Force">
        <div className="flex gap-2">
          {TIF_OPTIONS.map((t) => (
            <ToggleButton key={t.value} label={t.label} active={timeInForce === t.value} activeClass={BLUE_ACTIVE} onClick={() => onTimeInForceChange(t.value)} disabled={disabled} />
          ))}
        </div>
      </FieldGroup>

      <label className="flex items-center gap-2 text-body text-text-secondary">
        <input
          type="checkbox"
          checked={extendedHours}
          onChange={(e) => onExtendedHoursChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-border-secondary text-accent-blue focus:ring-accent-blue"
        />
        Extended hours trading
      </label>
    </div>
  )
}
