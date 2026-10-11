import type { TradableAssetClass } from '@/types/trading'

export type TradeFieldValues = {
  assetClass: TradableAssetClass
  accountId: string
  symbol: string
  side: string
  quantity: number
  orderType: string
  limitPrice?: number
  stopPrice?: number
  timeInForce?: string
  extendedHours?: boolean
  // Option
  underlying?: string
  optionType?: 'call' | 'put'
  strikePrice?: number
  expirationDate?: string
  // Mutual fund
  amountType?: 'dollars' | 'shares'
  dollarAmount?: number
  exchangeTargetSymbol?: string
  // Fixed income
  parAmount?: number
  bondPriceType?: string
  priceOrYield?: number
  // Digital asset
  fractionalQuantity?: boolean
}

export function validateTrade(v: TradeFieldValues): boolean {
  if (!v.accountId || !v.symbol || !v.side) return false

  switch (v.assetClass) {
    case 'equity':
      if (v.quantity <= 0) return false
      if (v.orderType === 'limit' && (!v.limitPrice || v.limitPrice <= 0)) return false
      if (v.orderType === 'stop' && (!v.stopPrice || v.stopPrice <= 0)) return false
      if (v.orderType === 'stop_limit' && (!v.limitPrice || v.limitPrice <= 0 || !v.stopPrice || v.stopPrice <= 0)) return false
      return true

    case 'option':
      if (v.quantity <= 0) return false
      if (!v.optionType || !v.strikePrice || !v.expirationDate) return false
      if (v.orderType === 'limit' && (!v.limitPrice || v.limitPrice <= 0)) return false
      return true

    case 'mutual_fund':
      if (v.amountType === 'dollars') {
        if (!v.dollarAmount || v.dollarAmount <= 0) return false
      } else {
        if (v.quantity <= 0) return false
      }
      if (v.side === 'exchange' && !v.exchangeTargetSymbol) return false
      return true

    case 'fixed_income':
      if (!v.parAmount || v.parAmount <= 0) return false
      if (!v.bondPriceType) return false
      if (v.orderType === 'limit' && (!v.priceOrYield || v.priceOrYield <= 0)) return false
      return true

    case 'digital_asset':
      if (v.quantity <= 0) return false
      if (v.orderType === 'limit' && (!v.limitPrice || v.limitPrice <= 0)) return false
      return true

    default:
      return false
  }
}
