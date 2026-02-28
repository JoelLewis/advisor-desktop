import { useState, useEffect, useRef } from 'react'
import { Info } from 'lucide-react'
import { FieldGroup, ToggleButton, TradeInput } from './shared'
import { useSymbolSearch } from '@/hooks/use-trading'
import { formatCurrency } from '@/lib/utils'
import type { MutualFundAction, MutualFundAmountType, SymbolSearchResult } from '@/types/trading'

type MutualFundTradeFieldsProps = {
  action: MutualFundAction
  onActionChange: (a: MutualFundAction) => void
  amountType: MutualFundAmountType
  onAmountTypeChange: (t: MutualFundAmountType) => void
  amount: string
  onAmountChange: (v: string) => void
  exchangeTarget: string
  onExchangeTargetChange: (sym: string) => void
  selectedSymbol: SymbolSearchResult | null
  disabled?: boolean
}

const ACTIONS: { value: MutualFundAction; label: string; activeClass: string }[] = [
  { value: 'purchase', label: 'Purchase', activeClass: 'border-accent-green bg-accent-green/10 text-accent-green' },
  { value: 'redemption', label: 'Redemption', activeClass: 'border-accent-red bg-accent-red/10 text-accent-red' },
  { value: 'exchange', label: 'Exchange', activeClass: 'border-accent-blue bg-accent-blue/10 text-accent-blue' },
]

const BLUE_ACTIVE = 'border-accent-blue bg-accent-blue/10 text-accent-blue'

export function MutualFundTradeFields({
  action, onActionChange,
  amountType, onAmountTypeChange,
  amount, onAmountChange,
  exchangeTarget, onExchangeTargetChange,
  selectedSymbol,
  disabled,
}: MutualFundTradeFieldsProps) {
  const [exchangeQuery, setExchangeQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(exchangeQuery), 300)
    return () => clearTimeout(timer)
  }, [exchangeQuery])

  const { data: exchangeResults } = useSymbolSearch(debouncedQuery, 'mutual_fund')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-4">
      {/* Action */}
      <FieldGroup label="Action">
        <div className="flex gap-2">
          {ACTIONS.map((a) => (
            <ToggleButton key={a.value} label={a.label} active={action === a.value} activeClass={a.activeClass} onClick={() => onActionChange(a.value)} disabled={disabled} />
          ))}
        </div>
      </FieldGroup>

      {/* NAV info card */}
      {selectedSymbol && selectedSymbol.nav != null && (
        <div className="rounded-md border border-border-primary bg-surface-secondary p-3">
          <div className="mb-1 text-caption font-semibold text-text-secondary">Fund Details</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-caption">
            <div className="flex justify-between">
              <span className="text-text-secondary">NAV</span>
              <span className="font-mono font-medium">{formatCurrency(selectedSymbol.nav)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">NAV Date</span>
              <span className="font-mono font-medium">{selectedSymbol.navDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Expense Ratio</span>
              <span className="font-mono font-medium">{selectedSymbol.expenseRatio != null ? `${selectedSymbol.expenseRatio.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Category</span>
              <span className="font-medium">{selectedSymbol.category ?? '—'}</span>
            </div>
            {selectedSymbol.minInvestment != null && selectedSymbol.minInvestment > 0 && (
              <div className="col-span-2 flex justify-between">
                <span className="text-text-secondary">Min Investment</span>
                <span className="font-mono font-medium">{formatCurrency(selectedSymbol.minInvestment)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amount type */}
      <FieldGroup label="Amount Type">
        <div className="flex gap-2">
          <ToggleButton label="Dollar Amount" active={amountType === 'dollars'} activeClass={BLUE_ACTIVE} onClick={() => onAmountTypeChange('dollars')} disabled={disabled} />
          <ToggleButton label="Shares" active={amountType === 'shares'} activeClass={BLUE_ACTIVE} onClick={() => onAmountTypeChange('shares')} disabled={disabled} />
        </div>
      </FieldGroup>

      {/* Amount */}
      <FieldGroup label={amountType === 'dollars' ? 'Dollar Amount' : 'Number of Shares'} htmlFor="mf-amount">
        <TradeInput
          id="mf-amount"
          value={amount}
          onChange={onAmountChange}
          placeholder={amountType === 'dollars' ? '$0.00' : '0'}
          min={amountType === 'dollars' ? 0.01 : 0.001}
          step={amountType === 'dollars' ? 0.01 : 0.001}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Exchange target */}
      {action === 'exchange' && (
        <div ref={dropdownRef} className="relative">
          <FieldGroup label="Exchange Into Fund" htmlFor="mf-exchange">
            <input
              id="mf-exchange"
              type="text"
              value={exchangeTarget || exchangeQuery}
              onChange={(e) => {
                setExchangeQuery(e.target.value)
                onExchangeTargetChange('')
                setShowDropdown(true)
              }}
              onFocus={() => { if (exchangeQuery) setShowDropdown(true) }}
              placeholder="Search fund..."
              disabled={disabled}
              className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary outline-hidden placeholder:text-text-tertiary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
            />
          </FieldGroup>
          {showDropdown && exchangeResults && exchangeResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-border-primary bg-surface-primary shadow-lg">
              {exchangeResults.map((sym) => (
                <button
                  key={sym.symbol}
                  onClick={() => {
                    onExchangeTargetChange(sym.symbol)
                    setExchangeQuery(sym.symbol)
                    setShowDropdown(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-tertiary"
                >
                  <span className="font-mono text-mono-sm font-semibold">{sym.symbol}</span>
                  <span className="ml-2 text-caption text-text-secondary">{sym.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NAV execution notice */}
      <div className="flex items-start gap-2 rounded-md bg-accent-blue/5 border border-accent-blue/20 px-3 py-2.5">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-blue" />
        <span className="text-caption text-accent-blue">
          Mutual fund orders execute at the next calculated NAV (typically 4:00 PM ET). No limit orders or time-in-force options are available.
        </span>
      </div>
    </div>
  )
}
