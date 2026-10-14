/** Fee derivation. Pure — no I/O, no fixture imports. */
export type FeeTier = { upTo: number | null; rate: number }

/**
 * Marginal tiered billing. A proposal previously hardcoded
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
