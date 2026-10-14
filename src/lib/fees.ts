/**
 * Fee derivation. Pure — no I/O, no fixture imports — same shape as `@/lib/aum`.
 *
 * C29 · fee-billing — the book's effective fee is asset-weighted (Σ household annual fees ÷ Σ AUM),
 * not the unweighted mean of per-household rates. An unweighted mean lets a handful of small,
 * high-rate households pull the reported figure away from what the book actually collects.
 */
export type HouseholdFeeInput = {
  aum: number
  annualFee: number
}

/** 0.0085 → 85. The single place `× 10_000` happens when converting a rate to basis points. */
export function bps(rate: number): number {
  return rate * 10_000
}

/** 85 → 0.0085. Inverse of `bps`. */
export function rateFromBps(basisPoints: number): number {
  return basisPoints / 10_000
}

/** Σ annualFee ÷ Σ aum, expressed in basis points (1% = 100 bps). */
export function assetWeightedEffectiveFee(fees: readonly HouseholdFeeInput[]): number {
  const totalAUM = fees.reduce((sum, f) => sum + f.aum, 0)
  if (totalAUM === 0) return 0
  const totalFees = fees.reduce((sum, f) => sum + f.annualFee, 0)
  return bps(totalFees / totalAUM)
}

export type FeeTier = { upTo: number | null; rate: number }

/**
 * C33 · fee-billing / fee-disclosure — marginal tiered billing. A proposal previously hardcoded
 * "$40,250 (0.805% blended rate)" for a $5,000,000 portfolio; tpl-001's own tier table gives
 * $45,500 / 0.91%, a $5,250/yr understatement in a client-facing fee disclosure. Each tier's rate
 * applies only to the slice of AUM that falls within it — not to the whole balance.
 */
export function blendedTieredFee(
  aum: number,
  tiers: readonly FeeTier[],
): { fee: number; blendedRate: number } {
  let remaining = aum
  let floor = 0
  let fee = 0
  for (const tier of tiers) {
    if (remaining <= 0) break
    const ceiling = tier.upTo ?? Number.POSITIVE_INFINITY
    const slice = Math.min(remaining, ceiling - floor)
    fee += slice * tier.rate
    remaining -= slice
    floor = ceiling
  }
  return { fee, blendedRate: aum === 0 ? 0 : fee / aum }
}

export type FeeTierSlice = { from: number; upTo: number | null; rate: number; slice: number; fee: number }

/** The schedule tier by tier: each tier's rate on the slice of `aum` inside it. Σ fee is `blendedTieredFee(aum, tiers).fee`. */
export function tierSlices(aum: number, tiers: readonly FeeTier[]): FeeTierSlice[] {
  let floor = 0
  return tiers.map((tier) => {
    const ceiling = tier.upTo ?? Number.POSITIVE_INFINITY
    const slice = Math.max(0, Math.min(aum, ceiling) - floor)
    const row: FeeTierSlice = { from: floor, upTo: tier.upTo, rate: tier.rate, slice, fee: slice * tier.rate }
    floor = ceiling
    return row
  })
}
