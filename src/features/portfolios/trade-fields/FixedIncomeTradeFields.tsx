import { FieldGroup, ToggleButton, TradeInput } from './shared'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { BondSide, BondOrderType, BondPriceType, TimeInForce, SymbolSearchResult } from '@/types/trading'

type FixedIncomeTradeFieldsProps = {
  side: BondSide
  onSideChange: (s: BondSide) => void
  parAmount: string
  onParAmountChange: (v: string) => void
  bondPriceType: BondPriceType
  onBondPriceTypeChange: (t: BondPriceType) => void
  priceOrYield: string
  onPriceOrYieldChange: (v: string) => void
  orderType: BondOrderType
  onOrderTypeChange: (t: BondOrderType) => void
  timeInForce: TimeInForce
  onTimeInForceChange: (t: TimeInForce) => void
  selectedSymbol: SymbolSearchResult | null
  disabled?: boolean
}

const PRICE_TYPES: { value: BondPriceType; label: string }[] = [
  { value: 'price', label: 'Price (%)' },
  { value: 'yield_to_maturity', label: 'YTM' },
  { value: 'yield_to_worst', label: 'YTW' },
]

const BLUE_ACTIVE = 'border-accent-blue bg-accent-blue/10 text-accent-blue'

const RATING_COLORS: Record<string, 'green' | 'yellow' | 'red' | 'default'> = {
  AAA: 'green', 'AA+': 'green', AA: 'green', 'AA-': 'green',
  'A+': 'green', A: 'green', 'A-': 'yellow',
  'BBB+': 'yellow', BBB: 'yellow', 'BBB-': 'yellow',
  'BB+': 'red', BB: 'red',
}

export function FixedIncomeTradeFields({
  side, onSideChange,
  parAmount, onParAmountChange,
  bondPriceType, onBondPriceTypeChange,
  priceOrYield, onPriceOrYieldChange,
  orderType, onOrderTypeChange,
  timeInForce, onTimeInForceChange,
  selectedSymbol,
  disabled,
}: FixedIncomeTradeFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Side */}
      <FieldGroup label="Side">
        <div className="flex gap-2">
          <ToggleButton label="Buy" active={side === 'buy'} activeClass="border-accent-green bg-accent-green/10 text-accent-green" onClick={() => onSideChange('buy')} disabled={disabled} />
          <ToggleButton label="Sell" active={side === 'sell'} activeClass="border-accent-red bg-accent-red/10 text-accent-red" onClick={() => onSideChange('sell')} disabled={disabled} />
        </div>
      </FieldGroup>

      {/* Bond detail card */}
      {selectedSymbol && selectedSymbol.couponRate != null && (
        <div className="rounded-md border border-border-primary bg-surface-secondary p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-semibold text-text-secondary">Bond Details</span>
            {selectedSymbol.creditRating && (
              <Badge variant={RATING_COLORS[selectedSymbol.creditRating] ?? 'default'}>
                {selectedSymbol.creditRating}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-caption">
            <div className="flex justify-between">
              <span className="text-text-secondary">Coupon</span>
              <span className="font-mono font-medium">{selectedSymbol.couponRate.toFixed(3)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Maturity</span>
              <span className="font-mono font-medium">{selectedSymbol.maturityDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">YTM</span>
              <span className="font-mono font-medium">{selectedSymbol.yieldToMaturity?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">YTW</span>
              <span className="font-mono font-medium">{selectedSymbol.yieldToWorst?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Duration</span>
              <span className="font-mono font-medium">{selectedSymbol.duration?.toFixed(2)} yrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Par Value</span>
              <span className="font-mono font-medium">{formatCurrency(selectedSymbol.parValue ?? 1000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Issuer</span>
              <span className="font-medium">{selectedSymbol.issuer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Type</span>
              <span className="font-medium capitalize">{selectedSymbol.bondType}</span>
            </div>
          </div>
        </div>
      )}

      {/* Par amount */}
      <FieldGroup label="Par Value ($1,000 increments)" htmlFor="fi-par">
        <TradeInput id="fi-par" value={parAmount} onChange={onParAmountChange} placeholder="$0" min={1000} step={1000} disabled={disabled} />
      </FieldGroup>

      {/* Price type */}
      <FieldGroup label="Price Type">
        <div className="flex gap-2">
          {PRICE_TYPES.map((t) => (
            <ToggleButton key={t.value} label={t.label} active={bondPriceType === t.value} activeClass={BLUE_ACTIVE} onClick={() => onBondPriceTypeChange(t.value)} disabled={disabled} />
          ))}
        </div>
      </FieldGroup>

      {/* Price/yield input */}
      <FieldGroup
        label={bondPriceType === 'price' ? 'Price (% of par)' : bondPriceType === 'yield_to_maturity' ? 'Yield to Maturity (%)' : 'Yield to Worst (%)'}
        htmlFor="fi-price"
      >
        <TradeInput
          id="fi-price"
          value={priceOrYield}
          onChange={onPriceOrYieldChange}
          placeholder={bondPriceType === 'price' ? '100.00' : '0.00'}
          min={0.01}
          step={0.01}
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
