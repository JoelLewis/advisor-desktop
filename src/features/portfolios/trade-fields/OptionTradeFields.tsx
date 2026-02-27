import { FieldGroup, ToggleButton, TradeInput } from './shared'
import { useOptionChain } from '@/hooks/use-trading'
import { formatCurrency, cn } from '@/lib/utils'
import type { OptionSide, TimeInForce, OptionQuote } from '@/types/trading'

type OptionTradeFieldsProps = {
  underlying: string
  optionType: 'call' | 'put'
  onOptionTypeChange: (t: 'call' | 'put') => void
  expirationDate: string
  onExpirationDateChange: (d: string) => void
  strikePrice: string
  onStrikePriceChange: (s: string) => void
  side: OptionSide
  onSideChange: (s: OptionSide) => void
  quantity: string
  onQuantityChange: (v: string) => void
  orderType: 'market' | 'limit'
  onOrderTypeChange: (t: 'market' | 'limit') => void
  limitPrice: string
  onLimitPriceChange: (v: string) => void
  timeInForce: TimeInForce
  onTimeInForceChange: (t: TimeInForce) => void
  disabled?: boolean
}

const SIDES: { value: OptionSide; label: string; activeClass: string }[] = [
  { value: 'buy_to_open', label: 'Buy to Open', activeClass: 'border-accent-green bg-accent-green/10 text-accent-green' },
  { value: 'sell_to_close', label: 'Sell to Close', activeClass: 'border-accent-red bg-accent-red/10 text-accent-red' },
  { value: 'sell_to_open', label: 'Sell to Open', activeClass: 'border-accent-red bg-accent-red/10 text-accent-red' },
  { value: 'buy_to_close', label: 'Buy to Close', activeClass: 'border-accent-green bg-accent-green/10 text-accent-green' },
]

const BLUE_ACTIVE = 'border-accent-blue bg-accent-blue/10 text-accent-blue'

export function OptionTradeFields({
  underlying,
  optionType, onOptionTypeChange,
  expirationDate, onExpirationDateChange,
  strikePrice, onStrikePriceChange,
  side, onSideChange,
  quantity, onQuantityChange,
  orderType, onOrderTypeChange,
  limitPrice, onLimitPriceChange,
  timeInForce, onTimeInForceChange,
  disabled,
}: OptionTradeFieldsProps) {
  const { data: chain, isLoading } = useOptionChain(underlying)

  const selectedExpiration = chain?.expirations.find((e) => e.expirationDate === expirationDate)
  const selectedStrike = selectedExpiration?.strikes.find((s) => s.strikePrice === Number(strikePrice))
  const selectedQuote: OptionQuote | undefined = selectedStrike?.[optionType]

  return (
    <div className="space-y-4">
      {/* Option type */}
      <FieldGroup label="Option Type">
        <div className="flex gap-2">
          <ToggleButton label="Call" active={optionType === 'call'} activeClass={BLUE_ACTIVE} onClick={() => onOptionTypeChange('call')} disabled={disabled} />
          <ToggleButton label="Put" active={optionType === 'put'} activeClass={BLUE_ACTIVE} onClick={() => onOptionTypeChange('put')} disabled={disabled} />
        </div>
      </FieldGroup>

      {/* Expiration */}
      <FieldGroup label="Expiration" htmlFor="opt-exp">
        <select
          id="opt-exp"
          value={expirationDate}
          onChange={(e) => onExpirationDateChange(e.target.value)}
          disabled={disabled || isLoading}
          className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select expiration...</option>
          {chain?.expirations.map((exp) => (
            <option key={exp.expirationDate} value={exp.expirationDate}>
              {exp.expirationDate} ({exp.daysToExpiration} DTE)
            </option>
          ))}
        </select>
      </FieldGroup>

      {/* Strike */}
      <FieldGroup label="Strike Price" htmlFor="opt-strike">
        <select
          id="opt-strike"
          value={strikePrice}
          onChange={(e) => onStrikePriceChange(e.target.value)}
          disabled={disabled || !expirationDate}
          className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select strike...</option>
          {selectedExpiration?.strikes.map((s) => {
            const q = s[optionType]
            return (
              <option key={s.strikePrice} value={s.strikePrice}>
                ${s.strikePrice} — Bid {formatCurrency(q.bid)} / Ask {formatCurrency(q.ask)}
              </option>
            )
          })}
        </select>
      </FieldGroup>

      {/* Greeks card */}
      {selectedQuote && (
        <div className="rounded-md border border-accent-purple/30 bg-accent-purple/5 p-3">
          <div className="mb-2 text-caption font-semibold text-accent-purple">Greeks & Market Data</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-caption">
            <div className="flex justify-between">
              <span className="text-text-secondary">Underlying</span>
              <span className="font-mono font-medium">{formatCurrency(chain?.underlyingPrice ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">IV</span>
              <span className="font-mono font-medium">{(selectedQuote.impliedVolatility * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Bid / Ask</span>
              <span className="font-mono font-medium">{formatCurrency(selectedQuote.bid)} / {formatCurrency(selectedQuote.ask)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Delta</span>
              <span className={cn('font-mono font-medium', selectedQuote.delta > 0 ? 'text-accent-green' : 'text-accent-red')}>{selectedQuote.delta.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Gamma</span>
              <span className="font-mono font-medium">{selectedQuote.gamma.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Theta</span>
              <span className="font-mono font-medium text-accent-red">{selectedQuote.theta.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Vega</span>
              <span className="font-mono font-medium">{selectedQuote.vega.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Open Interest</span>
              <span className="font-mono font-medium">{selectedQuote.openInterest.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Side */}
      <FieldGroup label="Side">
        <div className="grid grid-cols-2 gap-2">
          {SIDES.map((s) => (
            <ToggleButton key={s.value} label={s.label} active={side === s.value} activeClass={s.activeClass} onClick={() => onSideChange(s.value)} disabled={disabled} />
          ))}
        </div>
      </FieldGroup>

      {/* Quantity */}
      <FieldGroup label="Contracts" htmlFor="opt-qty">
        <TradeInput id="opt-qty" value={quantity} onChange={onQuantityChange} placeholder="0" min={1} step={1} disabled={disabled} />
      </FieldGroup>

      {/* Order type */}
      <FieldGroup label="Order Type">
        <div className="flex gap-2">
          <ToggleButton label="Market" active={orderType === 'market'} activeClass={BLUE_ACTIVE} onClick={() => onOrderTypeChange('market')} disabled={disabled} />
          <ToggleButton label="Limit" active={orderType === 'limit'} activeClass={BLUE_ACTIVE} onClick={() => onOrderTypeChange('limit')} disabled={disabled} />
        </div>
      </FieldGroup>

      {orderType === 'limit' && (
        <FieldGroup label="Limit Price (per contract)" htmlFor="opt-limit">
          <TradeInput id="opt-limit" value={limitPrice} onChange={onLimitPriceChange} placeholder="$0.00" min={0.01} step={0.01} disabled={disabled} />
        </FieldGroup>
      )}

      {/* TIF */}
      <FieldGroup label="Time in Force">
        <div className="flex gap-2">
          <ToggleButton label="Day" active={timeInForce === 'day'} activeClass={BLUE_ACTIVE} onClick={() => onTimeInForceChange('day')} disabled={disabled} />
          <ToggleButton label="GTC" active={timeInForce === 'gtc'} activeClass={BLUE_ACTIVE} onClick={() => onTimeInForceChange('gtc')} disabled={disabled} />
        </div>
      </FieldGroup>
    </div>
  )
}
