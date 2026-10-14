/**
 * A small, disclosed, per-account risk model.
 *
 * C5 · forward-risk / historical-risk — every account previously returned the same
 * `var95: 485_000`, which renders as a 485% loss on a $100K account and is unlabelled on an $8.2M
 * one. VaR must scale with portfolio value and carry a horizon, a confidence level and a method.
 * C4 · performance-metrics — the reported Sharpe of 1.34 implied a ~19.8% return against the same
 * API's 12.4%; SR = (Rp − Rf)/σp computed from the same series gives 0.71.
 * C6 · performance-metrics / performance-reporting — tracking error is one annualised statistic,
 * not a different number per horizon, and R_p − R_b is *active return*, not Jensen's alpha.
 *
 * Assumptions are constants here so they can be rendered as disclosure text next to the numbers.
 */
import type { AssetClass } from '@/types/portfolio'

export type AssetClassRisk = {
  /** Sensitivity to the global equity market. */
  beta: number
  /** Annualised standard deviation of returns. */
  vol: number
  /** Trailing one-year realised total return. */
  return1Y: number
}

export const ASSET_CLASS_RISK: Record<string, AssetClassRisk> = {
  us_equity:        { beta: 1.00, vol: 0.155, return1Y: 0.145 },
  intl_equity:      { beta: 0.88, vol: 0.170, return1Y: 0.098 },
  emerging_markets: { beta: 1.15, vol: 0.220, return1Y: 0.082 },
  fixed_income:     { beta: 0.15, vol: 0.055, return1Y: 0.042 },
  alternatives:     { beta: 0.45, vol: 0.090, return1Y: 0.061 },
  real_estate:      { beta: 0.80, vol: 0.175, return1Y: 0.071 },
  commodities:      { beta: 0.35, vol: 0.180, return1Y: 0.088 },
  cash:             { beta: 0.00, vol: 0.005, return1Y: 0.048 },
  digital_assets:   { beta: 1.60, vol: 0.650, return1Y: 0.412 },
  private_equity:   { beta: 1.20, vol: 0.230, return1Y: 0.112 },
}

const FALLBACK: AssetClassRisk = { beta: 1.00, vol: 0.150, return1Y: 0.080 }

export const RISK_FREE_RATE = 0.04 as const
export const Z_95 = 1.645 as const
/** Downside deviation as a fraction of total volatility, under a symmetric-return assumption. */
const DOWNSIDE_FRACTION = 0.70
/** Modelled trailing-3-year maximum drawdown as a multiple of annualised volatility. */
const MAX_DRAWDOWN_MULTIPLE = 1.2

function risk(assetClass: string): AssetClassRisk {
  return ASSET_CLASS_RISK[assetClass] ?? FALLBACK
}

const CORRELATION_GROUPS = ['equity', 'fixed_income', 'cash', 'real_assets', 'digital_assets'] as const
type CorrelationGroup = (typeof CORRELATION_GROUPS)[number]

/** Which correlation group each asset class belongs to. Typed over the whole union, so a new class must be placed. */
export const CORRELATION_GROUP: Readonly<Record<AssetClass, CorrelationGroup>> = {
  us_equity: 'equity', intl_equity: 'equity', emerging_markets: 'equity',
  fixed_income: 'fixed_income',
  cash: 'cash',
  alternatives: 'real_assets', real_estate: 'real_assets', commodities: 'real_assets', private_equity: 'real_assets',
  digital_assets: 'digital_assets',
}

/**
 * Model assumption: the correlation between two different asset classes, read off their groups.
 * Long-run, rounded figures of the kind a firm's capital-market assumptions publish, not estimates
 * from this book's returns:
 * - US, international and emerging-market equity move closely together: 0.85.
 * - Alternatives, real estate, commodities and private equity: 0.6 with one another, 0.5 with equity.
 * - Equity and fixed income: 0.3. Fixed income and cash: 0.1. Fixed income and the real-asset group: 0.2.
 * - Digital assets: 0.4 with equity, 0.3 with the real-asset group, 0.1 with fixed income.
 * - Cash is uncorrelated with every risky group.
 * Within a single-class group the entry is the class with itself, 1. The full matrix is symmetric
 * with 1 on the diagonal and positive definite (`risk-model.test.ts` factors it).
 */
const GROUP_CORRELATION: Readonly<Record<CorrelationGroup, Readonly<Record<CorrelationGroup, number>>>> = {
  equity:         { equity: 0.85, fixed_income: 0.3, cash: 0,   real_assets: 0.5, digital_assets: 0.4 },
  fixed_income:   { equity: 0.3,  fixed_income: 1,   cash: 0.1, real_assets: 0.2, digital_assets: 0.1 },
  cash:           { equity: 0,    fixed_income: 0.1, cash: 1,   real_assets: 0,   digital_assets: 0 },
  real_assets:    { equity: 0.5,  fixed_income: 0.2, cash: 0,   real_assets: 0.6, digital_assets: 0.3 },
  digital_assets: { equity: 0.4,  fixed_income: 0.1, cash: 0,   real_assets: 0.3, digital_assets: 1 },
}

const isAssetClass = (value: string): value is AssetClass => Object.prototype.hasOwnProperty.call(CORRELATION_GROUP, value)

function groupOf(assetClass: string): CorrelationGroup {
  if (!isAssetClass(assetClass)) throw new Error(`No correlation assumption covers asset class ${assetClass}`)
  return CORRELATION_GROUP[assetClass]
}

/** ρ between two asset classes: 1 for a class with itself, otherwise its groups' assumed correlation. */
export function assetClassCorrelation(a: string, b: string): number {
  const [ga, gb] = [groupOf(a), groupOf(b)]
  return a === b ? 1 : GROUP_CORRELATION[ga][gb]
}

const GROUP_WORDS: Readonly<Record<CorrelationGroup, string>> = {
  equity: 'equity', fixed_income: 'fixed income', cash: 'cash', real_assets: 'alternatives and real assets', digital_assets: 'digital assets',
}

const MEMBER_WORDS: Readonly<Record<CorrelationGroup, string>> = {
  equity: 'US, international and emerging-market equity', fixed_income: 'fixed income', cash: 'cash',
  real_assets: 'alternatives, real estate, commodities and private equity', digital_assets: 'digital assets',
}

/** The correlation assumptions as one disclosure sentence, read from the table above. */
export function correlationAssumptionsText(): string {
  const multi = CORRELATION_GROUPS.filter((g) => Object.values(CORRELATION_GROUP).filter((x) => x === g).length > 1)
  const within = multi.map((g) => `${MEMBER_WORDS[g]} ${GROUP_CORRELATION[g][g].toFixed(2)} with one another`)
  const across = CORRELATION_GROUPS.flatMap((g, i) => CORRELATION_GROUPS.slice(i + 1).map((h) => `${GROUP_WORDS[g]} with ${GROUP_WORDS[h]} ${GROUP_CORRELATION[g][h].toFixed(2)}`))
  return `correlation assumptions (rounded long-run figures, not estimated from this book's returns): ${[...within, ...across].join('; ')}`
}

/** Collapse positions to normalised asset-class weights that always sum to 1. */
export function assetClassWeights(
  positions: readonly { assetClass: string; weight: number }[],
): Map<string, number> {
  const total = positions.reduce((s, p) => s + p.weight, 0)
  const weights = new Map<string, number>()
  if (total === 0) return weights
  for (const p of positions) {
    weights.set(p.assetClass, (weights.get(p.assetClass) ?? 0) + p.weight / total)
  }
  return weights
}

export function portfolioBeta(weights: ReadonlyMap<string, number>): number {
  let beta = 0
  for (const [ac, w] of weights) beta += w * risk(ac).beta
  return beta
}

export function portfolioReturn1Y(weights: ReadonlyMap<string, number>): number {
  let r = 0
  for (const [ac, w] of weights) r += w * risk(ac).return1Y
  return r
}

/**
 * One asset class's trailing one-year index return, with the same fallback `portfolioReturn1Y`
 * applies. Attribution needs the per-class figure rather than the weighted total, and reading
 * `ASSET_CLASS_RISK` directly there would silently use a different fallback for an unmapped class,
 * so Σ wᵢ·assetClassReturn1Y(i) would stop equalling `portfolioReturn1Y`.
 */
export function assetClassReturn1Y(assetClass: string): number {
  return risk(assetClass).return1Y
}

/** wᵀΣw with Σᵢⱼ = σᵢσⱼρᵢⱼ, ρ from `assetClassCorrelation`. */
function variance(weights: readonly (readonly [string, number])[]): number {
  let total = 0
  for (const [ai, wi] of weights) {
    for (const [aj, wj] of weights) total += wi * wj * risk(ai).vol * risk(aj).vol * assetClassCorrelation(ai, aj)
  }
  return total
}

/** σp = √(ΣᵢΣⱼ wᵢwⱼσᵢσⱼρᵢⱼ), with ρ the grouped correlation assumptions above. */
export function portfolioVolatility(weights: ReadonlyMap<string, number>): number {
  return Math.sqrt(Math.max(variance([...weights.entries()]), 0))
}

/** Annualised active risk against a benchmark's asset-class weights. */
export function trackingError(
  portfolio: ReadonlyMap<string, number>,
  benchmark: ReadonlyMap<string, number>,
): number {
  const classes = new Set([...portfolio.keys(), ...benchmark.keys()])
  const active = [...classes].map((ac) =>
    [ac, (portfolio.get(ac) ?? 0) - (benchmark.get(ac) ?? 0)] as const,
  )
  return Math.sqrt(Math.max(variance(active), 0))
}

/**
 * Parametric (variance-covariance) VaR. Positive number = expected loss.
 *
 * @param annualVol — **must be rounded to 4 decimal places by the caller** before this call,
 * e.g. `Math.round(portfolioVolatility(weights) * 10_000) / 10_000`. This function does not
 * round it for you — per the `aum.ts` convention, pure lib functions don't round, callers do —
 * but skipping the round is not a cosmetic omission: at $12M, feeding the raw
 * `portfolioVolatility` output for acc-006 (σ = 0.104676...) instead of the rounded 0.1047
 * produces $596,492.54 instead of the correct $596,627.42 — $134.88 of drift on one account,
 * an order of magnitude past the "±1" tolerance the model's spec warns about. See
 * `risk-model.test.ts`'s "rounding order is load-bearing" test, which asserts both the correct
 * rounded-then-VaR value and that skipping the round produces a materially different number.
 */
export function parametricVaR(
  value: number,
  annualVol: number,
  horizonMonths = 1,
  z: number = Z_95,
): number {
  return value * z * annualVol * Math.sqrt(horizonMonths / 12)
}

export function sharpe(return1Y: number, vol: number): number {
  return vol === 0 ? 0 : (return1Y - RISK_FREE_RATE) / vol
}

export function downsideDeviation(vol: number): number {
  return vol * DOWNSIDE_FRACTION
}

export function sortino(return1Y: number, dd: number): number {
  return dd === 0 ? 0 : (return1Y - RISK_FREE_RATE) / dd
}

export function modelledMaxDrawdown(vol: number): number {
  return -MAX_DRAWDOWN_MULTIPLE * vol
}
