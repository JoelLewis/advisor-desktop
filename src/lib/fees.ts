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

export function householdAnnualFee(aum: number, annualRate: number): number {
  return aum * annualRate
}

/** Σ annualFee ÷ Σ aum, expressed in basis points (1% = 100 bps). */
export function assetWeightedEffectiveFee(fees: readonly HouseholdFeeInput[]): number {
  const totalAUM = fees.reduce((sum, f) => sum + f.aum, 0)
  if (totalAUM === 0) return 0
  const totalFees = fees.reduce((sum, f) => sum + f.annualFee, 0)
  return (totalFees / totalAUM) * 10_000
}
