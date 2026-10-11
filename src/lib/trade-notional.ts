import type { TradableAssetClass } from '@/types/trading'

export type EstimatedValueInput = {
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
 * to check. Every caller (order summary, pre-trade check) reads this one formula.
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
