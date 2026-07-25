/* eslint-disable react-refresh/only-export-components -- shared utility components + the notional formula */
import { TrendingUp, Layers, PieChart, Landmark, Bitcoin } from 'lucide-react'
import type { TradableAssetClass } from '@/types/trading'
import { cn, formatCurrency } from '@/lib/utils'

// ── FieldGroup ────────────────────────────────────────────────────────

export function FieldGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-caption font-semibold text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

// ── ToggleButton ──────────────────────────────────────────────────────

type ToggleButtonProps = {
  label: string
  active: boolean
  activeClass: string
  onClick: () => void
  disabled?: boolean
}

export function ToggleButton({ label, active, activeClass, onClick, disabled }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-md border px-3 py-2 text-body font-medium transition-colors',
        active ? activeClass : 'border-border-secondary text-text-secondary hover:bg-surface-tertiary',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {label}
    </button>
  )
}

// ── TextInput (reusable styled input) ────────────────────────────────

export function TradeInput({
  id,
  type = 'number',
  value,
  onChange,
  placeholder,
  min,
  step,
  disabled,
}: {
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: string | number
  step?: string | number
  disabled?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      disabled={disabled}
      className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-mono-sm text-text-primary outline-hidden placeholder:text-text-tertiary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
    />
  )
}

// ── AssetClassSelector ────────────────────────────────────────────────

const ASSET_CLASS_CONFIG: { value: TradableAssetClass; label: string; shortLabel: string; Icon: typeof TrendingUp }[] = [
  { value: 'equity', label: 'Equities', shortLabel: 'Equity', Icon: TrendingUp },
  { value: 'option', label: 'Options', shortLabel: 'Option', Icon: Layers },
  { value: 'mutual_fund', label: 'Mutual Funds', shortLabel: 'Fund', Icon: PieChart },
  { value: 'fixed_income', label: 'Fixed Income', shortLabel: 'Bond', Icon: Landmark },
  { value: 'digital_asset', label: 'Digital Assets', shortLabel: 'Crypto', Icon: Bitcoin },
]

type AssetClassSelectorProps = {
  value: TradableAssetClass
  onChange: (v: TradableAssetClass) => void
  compact?: boolean
}

export function AssetClassSelector({ value, onChange, compact }: AssetClassSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-border-primary bg-surface-secondary p-1">
      {ASSET_CLASS_CONFIG.map(({ value: v, label, shortLabel, Icon }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-caption font-medium transition-colors',
            value === v
              ? 'bg-surface-primary text-accent-blue shadow-xs'
              : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          <Icon className={cn('flex-shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          <span className={compact ? 'hidden xl:inline' : ''}>{compact ? shortLabel : label}</span>
        </button>
      ))}
    </div>
  )
}

// ── OrderSummaryCard ──────────────────────────────────────────────────

type OrderSummaryProps = {
  assetClass: TradableAssetClass
  side: string
  quantity: number
  price: number
  symbol: string
  // Asset-specific
  contractMultiplier?: number
  parAmount?: number
  dollarAmount?: number
}

const COMMISSION: Record<TradableAssetClass, number> = {
  equity: 4.95,
  option: 0.65, // per contract
  mutual_fund: 0,
  fixed_income: 1.00, // per bond
  digital_asset: 0,
}

const COMMISSION_LABEL: Record<TradableAssetClass, string> = {
  equity: 'Commission',
  option: 'Commission (per contract)',
  mutual_fund: 'Commission',
  fixed_income: 'Commission (per bond)',
  digital_asset: 'Commission',
}

type EstimatedValueInput = {
  assetClass: TradableAssetClass
  quantity: number
  price: number
  contractMultiplier?: number
  parAmount?: number
  dollarAmount?: number
}

/**
 * Critical fix round 2 · pre-trade-compliance — the one place notional is computed from an
 * order's raw fields. `SingleTradeView` used to send `quantity * price` straight to the
 * pre-trade check regardless of asset class, which is off by the contract multiplier for
 * options (100x low on a 500-contract order), ignores `parAmount` for bonds (10x low), and
 * ignores `dollarAmount` for funds (~1000x low on a dollar-amount purchase) — silently
 * evadable concentration and cash checks on exactly the three asset classes that screen exists
 * to check. `OrderSummaryCard` below is the other caller, so this is the one formula both read.
 */
export function computeEstimatedValue({ assetClass, quantity, price, contractMultiplier, parAmount, dollarAmount }: EstimatedValueInput): number {
  switch (assetClass) {
    case 'option':
      return quantity * price * (contractMultiplier ?? 100)
    case 'mutual_fund':
      return dollarAmount ?? quantity * price
    case 'fixed_income':
      return (parAmount ?? quantity * 1000) * (price / 100)
    case 'digital_asset':
      return quantity * price
    default:
      return quantity * price
  }
}

export function OrderSummaryCard({ assetClass, side, quantity, price, symbol, contractMultiplier, parAmount, dollarAmount }: OrderSummaryProps) {
  const estimatedValue = computeEstimatedValue({ assetClass, quantity, price, contractMultiplier, parAmount, dollarAmount })
  const commission = (() => {
    switch (assetClass) {
      case 'option': return quantity * COMMISSION.option
      case 'mutual_fund': return 0
      case 'fixed_income': return (parAmount ? parAmount / 1000 : quantity) * COMMISSION.fixed_income
      case 'digital_asset': return 0
      default: return COMMISSION.equity
    }
  })()

  const isBuy = ['buy', 'buy_to_open', 'buy_to_cover', 'purchase'].includes(side)
  const total = isBuy ? estimatedValue + commission : estimatedValue - commission

  return (
    <div className="rounded-md border border-border-primary bg-surface-secondary p-4">
      <h4 className="mb-2 text-caption font-semibold text-text-secondary">Order Summary</h4>
      <div className="space-y-1">
        <div className="flex justify-between text-body">
          <span className="text-text-secondary">Symbol</span>
          <span className="font-mono text-mono-sm font-semibold">{symbol}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-text-secondary">Estimated Value</span>
          <span className="font-mono text-mono-sm font-semibold">{formatCurrency(estimatedValue)}</span>
        </div>
        {commission > 0 && (
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">{COMMISSION_LABEL[assetClass]}</span>
            <span className="font-mono text-mono-sm">{formatCurrency(commission)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-border-primary pt-2 text-body">
          <span className="font-semibold text-text-primary">Total</span>
          <span className="font-mono text-mono-sm font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
