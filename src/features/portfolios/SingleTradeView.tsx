import { useState, useEffect, useRef } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { useAccounts } from '@/hooks/use-accounts'
import { useOrders, useSubmitTrade } from '@/hooks/use-orders'
import { useSymbolSearch } from '@/hooks/use-trading'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Order } from '@/services/oms'
import type { SymbolSearchResult } from '@/types/trading'

const STATUS_BADGE: Record<string, 'yellow' | 'blue' | 'green' | 'red'> = {
  pending: 'yellow',
  submitted: 'blue',
  filled: 'green',
  cancelled: 'red',
}

const orderColumns: ColumnDef<Order, unknown>[] = [
  { accessorKey: 'symbol', header: 'Symbol', cell: ({ getValue }) => <span className="font-mono text-mono-sm font-medium">{getValue<string>()}</span> },
  {
    accessorKey: 'side',
    header: 'Side',
    cell: ({ getValue }) => {
      const side = getValue<string>()
      return <Badge variant={side === 'buy' ? 'green' : 'red'}>{side.toUpperCase()}</Badge>
    },
  },
  { accessorKey: 'quantity', header: 'Qty', cell: ({ getValue }) => <span className="font-mono text-mono-sm">{getValue<number>()}</span> },
  { accessorKey: 'orderType', header: 'Type', cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span> },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue<string>()
      return <Badge variant={STATUS_BADGE[status] ?? 'default'}>{status}</Badge>
    },
  },
  {
    accessorKey: 'submittedAt',
    header: 'Submitted',
    cell: ({ getValue }) => <span className="text-text-secondary">{formatDate(getValue<string>())}</span>,
  },
]

export function SingleTradeView() {
  const { data: accounts } = useAccounts({})
  const { data: orders } = useOrders()
  const submitTrade = useSubmitTrade()

  // Form state
  const [accountId, setAccountId] = useState('')
  const [symbolQuery, setSymbolQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSearchResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounce symbol search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(symbolQuery), 300)
    return () => clearTimeout(timer)
  }, [symbolQuery])

  const { data: symbolResults } = useSymbolSearch(debouncedQuery)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectSymbol(sym: SymbolSearchResult) {
    setSelectedSymbol(sym)
    setSymbolQuery(sym.symbol)
    setShowDropdown(false)
  }

  const estimatedValue = selectedSymbol && quantity
    ? Number(quantity) * selectedSymbol.lastPrice
    : 0

  const canSubmit = accountId && selectedSymbol && Number(quantity) > 0 &&
    (orderType === 'market' || (orderType === 'limit' && Number(limitPrice) > 0))

  function handleSubmit() {
    if (!canSubmit || !selectedSymbol) return

    submitTrade.mutate(
      {
        accountId,
        symbol: selectedSymbol.symbol,
        side,
        quantity: Number(quantity),
        orderType,
        limitPrice: orderType === 'limit' ? Number(limitPrice) : undefined,
      },
      {
        onSuccess: () => {
          setSuccessMessage(`${side.toUpperCase()} ${quantity} ${selectedSymbol.symbol} submitted successfully`)
          setSelectedSymbol(null)
          setSymbolQuery('')
          setQuantity('')
          setLimitPrice('')
          setTimeout(() => setSuccessMessage(''), 4000)
        },
      },
    )
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left column — Trade form */}
      <div className="col-span-3 space-y-4">
        <Card>
          <CardHeader>New Order</CardHeader>
          <CardContent className="space-y-4">
            {/* Success toast */}
            {successMessage && (
              <div className="rounded-md bg-accent-green/10 px-4 py-3 text-body font-medium text-accent-green">
                {successMessage}
              </div>
            )}

            {/* Account selector */}
            <FieldGroup label="Account" htmlFor="single-trade-account">
              <select
                id="single-trade-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
              >
                <option value="">Select an account...</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountNumber}) - {formatCurrency(acc.totalValue, true)}
                  </option>
                ))}
              </select>
            </FieldGroup>

            {/* Symbol search */}
            <div ref={dropdownRef} className="relative">
              <label htmlFor="single-trade-symbol" className="mb-1 block text-caption font-semibold text-text-secondary">Symbol</label>
              <input
                id="single-trade-symbol"
                type="text"
                value={symbolQuery}
                onChange={(e) => {
                  setSymbolQuery(e.target.value)
                  setSelectedSymbol(null)
                  setShowDropdown(true)
                }}
                onFocus={() => { if (symbolQuery) setShowDropdown(true) }}
                placeholder="Search by symbol or name..."
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
              />
              {showDropdown && symbolResults && symbolResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border-primary bg-surface-primary shadow-lg">
                  {symbolResults.map((sym) => (
                    <button
                      key={sym.symbol}
                      onClick={() => handleSelectSymbol(sym)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-tertiary"
                    >
                      <div>
                        <span className="font-mono text-mono-sm font-semibold">{sym.symbol}</span>
                        <span className="ml-2 text-caption text-text-secondary">{sym.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-mono-sm">{formatCurrency(sym.lastPrice)}</span>
                        <span className={cn('ml-2 font-mono text-mono-sm', sym.change >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                          {sym.change >= 0 ? '+' : ''}{sym.changePct.toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected symbol info */}
            {selectedSymbol && (
              <div className="flex items-center gap-4 rounded-md bg-surface-tertiary px-3 py-2">
                <span className="font-mono text-mono-sm font-bold">{selectedSymbol.symbol}</span>
                <span className="text-body text-text-secondary">{selectedSymbol.name}</span>
                <span className="ml-auto font-mono text-mono-sm font-semibold">{formatCurrency(selectedSymbol.lastPrice)}</span>
                <span className={cn('font-mono text-mono-sm', selectedSymbol.change >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                  {selectedSymbol.change >= 0 ? '+' : ''}{formatCurrency(selectedSymbol.change)} ({selectedSymbol.changePct.toFixed(2)}%)
                </span>
              </div>
            )}

            {/* Side toggle */}
            <FieldGroup label="Side">
              <div className="flex gap-2">
                <ToggleButton
                  label="Buy"
                  active={side === 'buy'}
                  activeClass="border-accent-green bg-accent-green/10 text-accent-green"
                  onClick={() => setSide('buy')}
                />
                <ToggleButton
                  label="Sell"
                  active={side === 'sell'}
                  activeClass="border-accent-red bg-accent-red/10 text-accent-red"
                  onClick={() => setSide('sell')}
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Quantity" htmlFor="single-trade-qty">
              <input
                id="single-trade-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-mono-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
              />
            </FieldGroup>

            {/* Order type toggle */}
            <FieldGroup label="Order Type">
              <div className="flex gap-2">
                <ToggleButton
                  label="Market"
                  active={orderType === 'market'}
                  activeClass="border-accent-blue bg-accent-blue/10 text-accent-blue"
                  onClick={() => setOrderType('market')}
                />
                <ToggleButton
                  label="Limit"
                  active={orderType === 'limit'}
                  activeClass="border-accent-blue bg-accent-blue/10 text-accent-blue"
                  onClick={() => setOrderType('limit')}
                />
              </div>
            </FieldGroup>

            {/* Limit price (conditional) */}
            {orderType === 'limit' && (
              <FieldGroup label="Limit Price" htmlFor="single-trade-limit">
                <input
                  id="single-trade-limit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="$0.00"
                  className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 font-mono text-mono-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                />
              </FieldGroup>
            )}

            {/* Order summary */}
            {selectedSymbol && Number(quantity) > 0 && (
              <div className="rounded-md border border-border-primary bg-surface-secondary p-4">
                <h4 className="mb-2 text-caption font-semibold text-text-secondary">Order Summary</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-body">
                    <span className="text-text-secondary">Estimated Value</span>
                    <span className="font-mono text-mono-sm font-semibold">{formatCurrency(estimatedValue)}</span>
                  </div>
                  <div className="flex justify-between text-body">
                    <span className="text-text-secondary">Commission</span>
                    <span className="font-mono text-mono-sm">{formatCurrency(4.95)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-border-primary pt-2 text-body">
                    <span className="font-semibold text-text-primary">Total</span>
                    <span className="font-mono text-mono-sm font-bold">
                      {formatCurrency(side === 'buy' ? estimatedValue + 4.95 : estimatedValue - 4.95)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitTrade.isPending}
              className="w-full rounded-md bg-accent-blue px-4 py-2.5 text-body font-semibold text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitTrade.isPending ? 'Submitting...' : `Submit ${side.toUpperCase()} Order`}
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Right column — Recent orders */}
      <div className="col-span-2">
        <Card>
          <CardHeader>Recent Orders</CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={orders ?? []}
              columns={orderColumns}
              compact
              emptyMessage="No recent orders"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FieldGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-caption font-semibold text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

type ToggleButtonProps = {
  label: string
  active: boolean
  activeClass: string
  onClick: () => void
}

function ToggleButton({ label, active, activeClass, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md border px-4 py-2 text-body font-medium transition-colors',
        active ? activeClass : 'border-border-secondary text-text-secondary hover:bg-surface-tertiary',
      )}
    >
      {label}
    </button>
  )
}
