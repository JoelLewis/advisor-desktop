import type { FactorId, FactorRow } from '@/types/reference-risk'
import { assetClassBeta } from '@/lib/risk-model'

export const FACTORS: readonly { id: FactorId; label: string }[] = [
  { id: 'market', label: 'Market (equity beta)' }, { id: 'size', label: 'Size' }, { id: 'value', label: 'Value' }, { id: 'momentum', label: 'Momentum' },
  { id: 'quality', label: 'Quality' }, { id: 'rates', label: 'Rates (duration)' }, { id: 'credit', label: 'Credit' },
]

/**
 * Model assumptions (R11), not loadings estimated from returns: how much of each style factor one unit of
 * an asset class carries. The market loading is not here; it is the class's beta, derived from the correlation
 * and volatility assumptions (`assetClassBeta`).
 */
const STYLE_LOADINGS: Readonly<Record<string, Readonly<Record<Exclude<FactorId, 'market'>, number>>>> = {
  us_equity:        { size: 0.05, value: -0.05, momentum: 0.10, quality: 0.15, rates: -0.05, credit: 0.00 },
  intl_equity:      { size: 0.10, value: 0.20, momentum: 0.05, quality: 0.10, rates: -0.05, credit: 0.00 },
  emerging_markets: { size: 0.20, value: 0.25, momentum: 0.05, quality: -0.10, rates: -0.10, credit: 0.10 },
  fixed_income:     { size: 0.00, value: 0.00, momentum: 0.00, quality: 0.00, rates: 1.00, credit: 0.40 },
  alternatives:     { size: 0.05, value: 0.10, momentum: 0.20, quality: 0.05, rates: 0.20, credit: 0.30 },
  real_estate:      { size: 0.20, value: 0.30, momentum: 0.00, quality: -0.05, rates: 0.50, credit: 0.20 },
  commodities:      { size: 0.00, value: 0.10, momentum: 0.25, quality: 0.00, rates: -0.20, credit: 0.00 },
  cash:             { size: 0.00, value: 0.00, momentum: 0.00, quality: 0.00, rates: 0.05, credit: 0.00 },
  digital_assets:   { size: 0.30, value: -0.40, momentum: 0.60, quality: -0.30, rates: 0.00, credit: 0.00 },
  private_equity:   { size: 0.40, value: 0.20, momentum: 0.00, quality: 0.00, rates: 0.10, credit: 0.30 },
}

export function loadingOf(assetClass: string, factor: FactorId): number {
  const style = STYLE_LOADINGS[assetClass]
  if (!style) throw new Error(`No factor loadings for asset class ${assetClass}`)
  return factor === 'market' ? assetClassBeta(assetClass) : style[factor]
}

const exposure = (weights: ReadonlyMap<string, number>, factor: FactorId) => [...weights].reduce((s, [ac, w]) => s + w * loadingOf(ac, factor), 0)

/** The account's exposure (its weights × the loadings), its benchmark's (the model's targets × the loadings), and the difference. */
export function factorRows(weights: ReadonlyMap<string, number>, benchmark: ReadonlyMap<string, number>): FactorRow[] {
  return FACTORS.map(({ id, label }) => {
    const own = exposure(weights, id)
    const bench = exposure(benchmark, id)
    return { factor: id, label, exposure: own, benchmark: bench, active: own - bench }
  })
}
