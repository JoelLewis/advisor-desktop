/**
 * A small, disclosed, per-account risk model.
 *
 * C5 · forward-risk / historical-risk — every account previously returned the same
 * `var95: 485_000`, which renders as a 485% loss on a $100K account and is unlabelled on an $8.2M
 * one. VaR must scale with portfolio value and carry a horizon, a confidence level and a method.
 * C4 · performance-metrics — the reported Sharpe of 1.34 implied a ~19.8% return against the same
 * API's 12.4%; SR = (Rp − Rf)/σp computed from the same series gives 0.71.
 * C6 · performance-metrics / performance-reporting — tracking error is one annualized statistic,
 * not a different number per horizon, and R_p − R_b is *active return*, not Jensen's alpha.
 *
 * Assumptions are constants here so they can be rendered as disclosure text next to the numbers.
 */
import type { AssetClass } from '@/types/portfolio'

export type AssetClassRisk = {
  /** Annualized standard deviation of returns. */
  vol: number
  /** The class's one-year return: a modeled assumption, not a realized figure. */
  return1Y: number
}

/**
 * Phase 7a · beta is no longer hand-set beside σ: it is derived from these volatilities and the
 * correlation table below (`assetClassBeta`), so the factor table and σ agree about how equity-like
 * a sleeve is. Hand-set, real estate read 0.80 and private equity 1.20 while their correlations
 * implied 0.56 and 0.74.
 */
export const ASSET_CLASS_RISK: Readonly<Record<AssetClass, AssetClassRisk>> = {
  us_equity:        { vol: 0.155, return1Y: 0.145 },
  intl_equity:      { vol: 0.170, return1Y: 0.098 },
  emerging_markets: { vol: 0.220, return1Y: 0.082 },
  fixed_income:     { vol: 0.055, return1Y: 0.042 },
  alternatives:     { vol: 0.090, return1Y: 0.061 },
  real_estate:      { vol: 0.175, return1Y: 0.071 },
  commodities:      { vol: 0.180, return1Y: 0.088 },
  cash:             { vol: 0.005, return1Y: 0.048 },
  digital_assets:   { vol: 0.650, return1Y: 0.412 },
  private_equity:   { vol: 0.230, return1Y: 0.112 },
}

export const RISK_FREE_RATE = 0.04 as const
export const Z_95 = 1.645 as const
/** Downside deviation as a fraction of total volatility, under a symmetric-return assumption. */
const DOWNSIDE_FRACTION = 0.70
/** Modeled trailing-3-year maximum drawdown as a multiple of annualized volatility. */
const MAX_DRAWDOWN_MULTIPLE = 1.2

/** A class with no assumption is a broken invariant, never a default: the same throw as the correlation lookup. */
function risk(assetClass: string): AssetClassRisk {
  if (!isAssetClass(assetClass)) throw new Error(`No volatility or return assumption covers asset class ${assetClass}`)
  return ASSET_CLASS_RISK[assetClass]
}

const CORRELATION_GROUPS = ['equity', 'fixed_income', 'cash', 'real_assets', 'gold', 'private_equity', 'digital_assets'] as const
type CorrelationGroup = (typeof CORRELATION_GROUPS)[number]

/** Which correlation group each asset class belongs to. Typed over the whole union, so a new class must be placed. */
export const CORRELATION_GROUP: Readonly<Record<AssetClass, CorrelationGroup>> = {
  us_equity: 'equity', intl_equity: 'equity', emerging_markets: 'equity',
  fixed_income: 'fixed_income',
  cash: 'cash',
  alternatives: 'real_assets', real_estate: 'real_assets', commodities: 'gold', private_equity: 'private_equity',
  digital_assets: 'digital_assets',
}

/**
 * Model assumption: the correlation between two different asset classes, read off their groups.
 * Long-run, rounded figures of the kind a firm's capital-market assumptions publish, not estimates
 * from this book's returns:
 * - US, international and emerging-market equity move closely together: 0.85.
 * - Alternatives and real estate: 0.6 with one another, 0.5 with equity.
 * - Gold (the commodities sleeve holds GLD): its own group, 0.05 with equity, 0.2 with fixed income and real assets.
 * - Private equity: its own group, 0.75 with public equity (it is equity, marked less often), 0.6 with real assets.
 * - Equity and fixed income: 0.3. Fixed income and cash: 0.1. Fixed income and the real-asset group: 0.2.
 * - Digital assets: 0.4 with equity, 0.3 with real assets and private equity, 0.1 with fixed income and gold.
 * - Cash is uncorrelated with every risky group.
 * Within a single-class group the entry is the class with itself, 1. The full matrix is symmetric
 * with 1 on the diagonal and positive definite (`risk-model.test.ts` factors it).
 */
const GROUP_CORRELATION: Readonly<Record<CorrelationGroup, Readonly<Record<CorrelationGroup, number>>>> = {
  equity:         { equity: 0.85, fixed_income: 0.3, cash: 0,   real_assets: 0.5, gold: 0.05, private_equity: 0.75, digital_assets: 0.4 },
  fixed_income:   { equity: 0.3,  fixed_income: 1,   cash: 0.1, real_assets: 0.2, gold: 0.2,  private_equity: 0.2,  digital_assets: 0.1 },
  cash:           { equity: 0,    fixed_income: 0.1, cash: 1,   real_assets: 0,   gold: 0,    private_equity: 0,    digital_assets: 0 },
  real_assets:    { equity: 0.5,  fixed_income: 0.2, cash: 0,   real_assets: 0.6, gold: 0.2,  private_equity: 0.6,  digital_assets: 0.3 },
  gold:           { equity: 0.05, fixed_income: 0.2, cash: 0,   real_assets: 0.2, gold: 1,    private_equity: 0.05, digital_assets: 0.1 },
  private_equity: { equity: 0.75, fixed_income: 0.2, cash: 0,   real_assets: 0.6, gold: 0.05, private_equity: 1,    digital_assets: 0.3 },
  digital_assets: { equity: 0.4,  fixed_income: 0.1, cash: 0,   real_assets: 0.3, gold: 0.1,  private_equity: 0.3,  digital_assets: 1 },
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
  equity: 'equity', fixed_income: 'fixed income', cash: 'cash', real_assets: 'alternatives and real estate', gold: 'gold', private_equity: 'private equity', digital_assets: 'digital assets',
}

const MEMBER_WORDS: Readonly<Record<CorrelationGroup, string>> = {
  equity: 'US, international and emerging-market equity', fixed_income: 'fixed income', cash: 'cash',
  real_assets: 'alternatives and real estate', gold: 'gold', private_equity: 'private equity', digital_assets: 'digital assets',
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

/** The reference market the betas are measured against. */
export const BETA_REFERENCE = 'us_equity' satisfies AssetClass

/** βᵢ = ρ(i, US equity) · σᵢ / σ_US equity: read from the correlation and volatility assumptions, never set beside them. */
export function assetClassBeta(assetClass: string): number {
  return assetClassCorrelation(assetClass, BETA_REFERENCE) * risk(assetClass).vol / risk(BETA_REFERENCE).vol
}

export function portfolioBeta(weights: ReadonlyMap<string, number>): number {
  let beta = 0
  for (const [ac, w] of weights) beta += w * assetClassBeta(ac)
  return beta
}

export function portfolioReturn1Y(weights: ReadonlyMap<string, number>): number {
  let r = 0
  for (const [ac, w] of weights) r += w * risk(ac).return1Y
  return r
}

/**
 * One asset class's modeled one-year index return, through the same lookup `portfolioReturn1Y` uses,
 * so Σ wᵢ·assetClassReturn1Y(i) equals `portfolioReturn1Y`; an unmapped class throws on both.
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

/** Annualized active risk against a benchmark's asset-class weights. */
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

export function modeledMaxDrawdown(vol: number): number {
  return -MAX_DRAWDOWN_MULTIPLE * vol
}
