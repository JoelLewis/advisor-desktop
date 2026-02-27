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
import type { SymbolSearchResult, TradableAssetClass, EquitySide, EquityOrderType, OptionSide, MutualFundAction, MutualFundAmountType, BondSide, BondOrderType, BondPriceType, DigitalAssetSide, DigitalAssetOrderType, TimeInForce } from '@/types/trading'
import { AssetClassSelector, FieldGroup, OrderSummaryCard } from './trade-fields/shared'
import { EquityTradeFields } from './trade-fields/EquityTradeFields'
import { OptionTradeFields } from './trade-fields/OptionTradeFields'
import { MutualFundTradeFields } from './trade-fields/MutualFundTradeFields'
import { FixedIncomeTradeFields } from './trade-fields/FixedIncomeTradeFields'
import { DigitalAssetTradeFields } from './trade-fields/DigitalAssetTradeFields'
import { validateTrade } from './trade-fields/validation'

const STATUS_BADGE: Record<string, 'yellow' | 'blue' | 'green' | 'red'> = {
  pending: 'yellow',
  submitted: 'blue',
  filled: 'green',
  cancelled: 'red',
}

const ASSET_CLASS_LABEL: Record<string, string> = {
  equity: 'Equity',
  option: 'Option',
  mutual_fund: 'Fund',
  fixed_income: 'Bond',
  digital_asset: 'Crypto',
}

const orderColumns: ColumnDef<Order, unknown>[] = [
  { accessorKey: 'symbol', header: 'Symbol', cell: ({ getValue }) => <span className="font-mono text-mono-sm font-medium">{getValue<string>()}</span> },
  {
    accessorKey: 'assetClass',
    header: 'Class',
    cell: ({ getValue }) => {
      const ac = getValue<string>()
      return <span className="text-caption text-text-secondary">{ASSET_CLASS_LABEL[ac] ?? 'Equity'}</span>
    },
  },
  {
    accessorKey: 'side',
    header: 'Side',
    cell: ({ getValue }) => {
      const side = getValue<string>()
      const isBuy = ['buy', 'buy_to_open', 'buy_to_cover', 'purchase'].includes(side)
      return <Badge variant={isBuy ? 'green' : 'red'}>{side.replace(/_/g, ' ').toUpperCase()}</Badge>
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

  // ── Asset class ──
  const [assetClass, setAssetClass] = useState<TradableAssetClass>('equity')

  // ── Common state ──
  const [accountId, setAccountId] = useState('')
  const [symbolQuery, setSymbolQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSearchResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Equity state ──
  const [eqSide, setEqSide] = useState<EquitySide>('buy')
  const [eqQuantity, setEqQuantity] = useState('')
  const [eqOrderType, setEqOrderType] = useState<EquityOrderType>('market')
  const [eqLimitPrice, setEqLimitPrice] = useState('')
  const [eqStopPrice, setEqStopPrice] = useState('')
  const [eqTif, setEqTif] = useState<TimeInForce>('day')
  const [eqExtended, setEqExtended] = useState(false)

  // ── Option state ──
  const [optType, setOptType] = useState<'call' | 'put'>('call')
  const [optExpiration, setOptExpiration] = useState('')
  const [optStrike, setOptStrike] = useState('')
  const [optSide, setOptSide] = useState<OptionSide>('buy_to_open')
  const [optQuantity, setOptQuantity] = useState('')
  const [optOrderType, setOptOrderType] = useState<'market' | 'limit'>('market')
  const [optLimitPrice, setOptLimitPrice] = useState('')
  const [optTif, setOptTif] = useState<TimeInForce>('day')

  // ── Mutual fund state ──
  const [mfAction, setMfAction] = useState<MutualFundAction>('purchase')
  const [mfAmountType, setMfAmountType] = useState<MutualFundAmountType>('dollars')
  const [mfAmount, setMfAmount] = useState('')
  const [mfExchangeTarget, setMfExchangeTarget] = useState('')

  // ── Fixed income state ──
  const [fiSide, setFiSide] = useState<BondSide>('buy')
  const [fiParAmount, setFiParAmount] = useState('')
  const [fiBondPriceType, setFiBondPriceType] = useState<BondPriceType>('price')
  const [fiPriceOrYield, setFiPriceOrYield] = useState('')
  const [fiOrderType, setFiOrderType] = useState<BondOrderType>('market')
  const [fiTif, setFiTif] = useState<TimeInForce>('day')

  // ── Digital asset state ──
  const [daSide, setDaSide] = useState<DigitalAssetSide>('buy')
  const [daAmountType, setDaAmountType] = useState<'units' | 'dollars'>('units')
  const [daQuantity, setDaQuantity] = useState('')
  const [daOrderType, setDaOrderType] = useState<DigitalAssetOrderType>('market')
  const [daLimitPrice, setDaLimitPrice] = useState('')
  const [daTif, setDaTif] = useState<TimeInForce>('day')

  // Debounce symbol search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(symbolQuery), 300)
    return () => clearTimeout(timer)
  }, [symbolQuery])

  // For options, search equities (to find the underlying); for others, filter by asset class
  const searchAssetClass = assetClass === 'option' ? 'equity' : assetClass
  const { data: symbolResults } = useSymbolSearch(debouncedQuery, searchAssetClass)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset form when asset class changes
  function handleAssetClassChange(ac: TradableAssetClass) {
    setAssetClass(ac)
    setSelectedSymbol(null)
    setSymbolQuery('')
    setShowDropdown(false)
    setSuccessMessage('')
  }

  function handleSelectSymbol(sym: SymbolSearchResult) {
    setSelectedSymbol(sym)
    setSymbolQuery(sym.symbol)
    setShowDropdown(false)
  }

  // ── Build current side/quantity/price for summary ──
  function getCurrentSide(): string {
    switch (assetClass) {
      case 'equity': return eqSide
      case 'option': return optSide
      case 'mutual_fund': return mfAction
      case 'fixed_income': return fiSide
      case 'digital_asset': return daSide
    }
  }

  function getCurrentQuantity(): number {
    switch (assetClass) {
      case 'equity': return Number(eqQuantity)
      case 'option': return Number(optQuantity)
      case 'mutual_fund': return mfAmountType === 'shares' ? Number(mfAmount) : 1
      case 'fixed_income': return Number(fiParAmount) / (selectedSymbol?.parValue ?? 1000)
      case 'digital_asset': return Number(daQuantity)
    }
  }

  function getCurrentPrice(): number {
    if (!selectedSymbol) return 0
    switch (assetClass) {
      case 'equity': return selectedSymbol.lastPrice
      case 'option': return Number(optLimitPrice) || selectedSymbol.lastPrice
      case 'mutual_fund': return selectedSymbol.nav ?? selectedSymbol.lastPrice
      case 'fixed_income': return Number(fiPriceOrYield) || selectedSymbol.lastPrice
      case 'digital_asset': return selectedSymbol.lastPrice
    }
  }

  // ── Validation ──
  const canSubmit = validateTrade({
    assetClass,
    accountId,
    symbol: selectedSymbol?.symbol ?? '',
    side: getCurrentSide(),
    quantity: getCurrentQuantity(),
    orderType: assetClass === 'equity' ? eqOrderType : assetClass === 'option' ? optOrderType : assetClass === 'mutual_fund' ? 'market' : assetClass === 'fixed_income' ? fiOrderType : daOrderType,
    limitPrice: assetClass === 'equity' ? Number(eqLimitPrice) : assetClass === 'option' ? Number(optLimitPrice) : assetClass === 'digital_asset' ? Number(daLimitPrice) : undefined,
    stopPrice: assetClass === 'equity' ? Number(eqStopPrice) : undefined,
    optionType: assetClass === 'option' ? optType : undefined,
    strikePrice: assetClass === 'option' ? Number(optStrike) : undefined,
    expirationDate: assetClass === 'option' ? optExpiration : undefined,
    amountType: assetClass === 'mutual_fund' ? mfAmountType : undefined,
    dollarAmount: assetClass === 'mutual_fund' && mfAmountType === 'dollars' ? Number(mfAmount) : undefined,
    exchangeTargetSymbol: assetClass === 'mutual_fund' ? mfExchangeTarget : undefined,
    parAmount: assetClass === 'fixed_income' ? Number(fiParAmount) : undefined,
    bondPriceType: assetClass === 'fixed_income' ? fiBondPriceType : undefined,
    priceOrYield: assetClass === 'fixed_income' ? Number(fiPriceOrYield) : undefined,
  })

  // ── Submit ──
  function handleSubmit() {
    if (!canSubmit || !selectedSymbol) return

    const base = {
      accountId,
      symbol: selectedSymbol.symbol,
      assetClass,
    }

    let request: Parameters<typeof submitTrade.mutate>[0]

    switch (assetClass) {
      case 'equity':
        request = { ...base, side: eqSide, quantity: Number(eqQuantity), orderType: eqOrderType, limitPrice: Number(eqLimitPrice) || undefined, stopPrice: Number(eqStopPrice) || undefined, timeInForce: eqTif, extendedHours: eqExtended }
        break
      case 'option':
        request = { ...base, side: optSide, quantity: Number(optQuantity), orderType: optOrderType, limitPrice: Number(optLimitPrice) || undefined, timeInForce: optTif, underlying: selectedSymbol.symbol, optionType: optType, strikePrice: Number(optStrike), expirationDate: optExpiration, contractMultiplier: 100 }
        break
      case 'mutual_fund':
        request = { ...base, side: mfAction, quantity: mfAmountType === 'shares' ? Number(mfAmount) : 1, orderType: 'market', amountType: mfAmountType, dollarAmount: mfAmountType === 'dollars' ? Number(mfAmount) : undefined, exchangeTargetSymbol: mfAction === 'exchange' ? mfExchangeTarget : undefined }
        break
      case 'fixed_income':
        request = { ...base, side: fiSide, quantity: Number(fiParAmount) / (selectedSymbol.parValue ?? 1000), orderType: fiOrderType, timeInForce: fiTif, parAmount: Number(fiParAmount), bondPriceType: fiBondPriceType, priceOrYield: Number(fiPriceOrYield) || undefined }
        break
      case 'digital_asset':
        request = { ...base, side: daSide, quantity: Number(daQuantity), orderType: daOrderType, limitPrice: Number(daLimitPrice) || undefined, timeInForce: daTif, fractionalQuantity: true }
        break
    }

    submitTrade.mutate(request, {
      onSuccess: () => {
        setSuccessMessage(`Order submitted: ${getCurrentSide().replace(/_/g, ' ').toUpperCase()} ${selectedSymbol.symbol}`)
        setSelectedSymbol(null)
        setSymbolQuery('')
        setTimeout(() => setSuccessMessage(''), 4000)
      },
    })
  }

  const showSummary = selectedSymbol && getCurrentQuantity() > 0

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Left column — Trade form */}
      <div className="xl:col-span-3 space-y-4">
        <Card>
          <CardHeader>New Order</CardHeader>
          <CardContent className="space-y-4">
            {/* Success toast */}
            {successMessage && (
              <div className="rounded-md bg-accent-green/10 px-4 py-3 text-body font-medium text-accent-green">
                {successMessage}
              </div>
            )}

            {/* Asset class selector */}
            <AssetClassSelector value={assetClass} onChange={handleAssetClassChange} />

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
              <label htmlFor="single-trade-symbol" className="mb-1 block text-caption font-semibold text-text-secondary">
                {assetClass === 'option' ? 'Underlying Symbol' : 'Symbol'}
              </label>
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
                placeholder={assetClass === 'option' ? 'Search underlying (e.g. AAPL)...' : 'Search by symbol or name...'}
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-body text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
              />
              {showDropdown && symbolResults && symbolResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border-primary bg-surface-primary shadow-lg max-h-64 overflow-y-auto">
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

            {/* ── Asset-class-specific fields ── */}
            {assetClass === 'equity' && (
              <EquityTradeFields
                side={eqSide} onSideChange={setEqSide}
                quantity={eqQuantity} onQuantityChange={setEqQuantity}
                orderType={eqOrderType} onOrderTypeChange={setEqOrderType}
                limitPrice={eqLimitPrice} onLimitPriceChange={setEqLimitPrice}
                stopPrice={eqStopPrice} onStopPriceChange={setEqStopPrice}
                timeInForce={eqTif} onTimeInForceChange={setEqTif}
                extendedHours={eqExtended} onExtendedHoursChange={setEqExtended}
              />
            )}

            {assetClass === 'option' && selectedSymbol && (
              <OptionTradeFields
                underlying={selectedSymbol.symbol}
                optionType={optType} onOptionTypeChange={setOptType}
                expirationDate={optExpiration} onExpirationDateChange={setOptExpiration}
                strikePrice={optStrike} onStrikePriceChange={setOptStrike}
                side={optSide} onSideChange={setOptSide}
                quantity={optQuantity} onQuantityChange={setOptQuantity}
                orderType={optOrderType} onOrderTypeChange={setOptOrderType}
                limitPrice={optLimitPrice} onLimitPriceChange={setOptLimitPrice}
                timeInForce={optTif} onTimeInForceChange={setOptTif}
              />
            )}

            {assetClass === 'mutual_fund' && (
              <MutualFundTradeFields
                action={mfAction} onActionChange={setMfAction}
                amountType={mfAmountType} onAmountTypeChange={setMfAmountType}
                amount={mfAmount} onAmountChange={setMfAmount}
                exchangeTarget={mfExchangeTarget} onExchangeTargetChange={setMfExchangeTarget}
                selectedSymbol={selectedSymbol}
              />
            )}

            {assetClass === 'fixed_income' && (
              <FixedIncomeTradeFields
                side={fiSide} onSideChange={setFiSide}
                parAmount={fiParAmount} onParAmountChange={setFiParAmount}
                bondPriceType={fiBondPriceType} onBondPriceTypeChange={setFiBondPriceType}
                priceOrYield={fiPriceOrYield} onPriceOrYieldChange={setFiPriceOrYield}
                orderType={fiOrderType} onOrderTypeChange={setFiOrderType}
                timeInForce={fiTif} onTimeInForceChange={setFiTif}
                selectedSymbol={selectedSymbol}
              />
            )}

            {assetClass === 'digital_asset' && (
              <DigitalAssetTradeFields
                side={daSide} onSideChange={setDaSide}
                amountType={daAmountType} onAmountTypeChange={setDaAmountType}
                quantity={daQuantity} onQuantityChange={setDaQuantity}
                orderType={daOrderType} onOrderTypeChange={setDaOrderType}
                limitPrice={daLimitPrice} onLimitPriceChange={setDaLimitPrice}
                timeInForce={daTif} onTimeInForceChange={setDaTif}
                selectedSymbol={selectedSymbol}
              />
            )}

            {/* Order summary */}
            {showSummary && (
              <OrderSummaryCard
                assetClass={assetClass}
                side={getCurrentSide()}
                quantity={getCurrentQuantity()}
                price={getCurrentPrice()}
                symbol={selectedSymbol?.symbol ?? ''}
                contractMultiplier={assetClass === 'option' ? 100 : undefined}
                parAmount={assetClass === 'fixed_income' ? Number(fiParAmount) : undefined}
                dollarAmount={assetClass === 'mutual_fund' && mfAmountType === 'dollars' ? Number(mfAmount) : undefined}
              />
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitTrade.isPending}
              className="w-full rounded-md bg-accent-blue px-4 py-2.5 text-body font-semibold text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitTrade.isPending ? 'Submitting...' : `Submit ${getCurrentSide().replace(/_/g, ' ').toUpperCase()} Order`}
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Right column — Recent orders */}
      <div className="xl:col-span-2">
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
