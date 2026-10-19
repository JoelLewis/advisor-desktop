export type RiskProfile = 'conservative' | 'moderate_conservative' | 'moderate' | 'moderate_aggressive' | 'aggressive'
export type ProfileBand = { profile: RiskProfile; label: string; floor: number; ceiling: number; modelId: string }

/**
 * Firm policy: the questionnaire's average score, read into a band, names the firm model for it. The
 * one table every surface reads (the onboarding questionnaire, the Prospect Profile agent, the
 * proposal, its best-interest record). Bands are inclusive and cover 0–100; models get riskier with
 * the band (equity 25%, 50%, 55%, 75%, 80%).
 */
export const RISK_PROFILE_TABLE: readonly ProfileBand[] = [
  { profile: 'conservative', label: 'Conservative', floor: 0, ceiling: 25, modelId: 'mod-003' },
  { profile: 'moderate_conservative', label: 'Moderate Conservative', floor: 26, ceiling: 40, modelId: 'mod-007' },
  { profile: 'moderate', label: 'Moderate', floor: 41, ceiling: 55, modelId: 'mod-001' },
  { profile: 'moderate_aggressive', label: 'Moderate Aggressive', floor: 56, ceiling: 75, modelId: 'mod-002' },
  { profile: 'aggressive', label: 'Aggressive', floor: 76, ceiling: 100, modelId: 'mod-004' },
]

export function bandFor(score: number): ProfileBand {
  const band = RISK_PROFILE_TABLE.find((b) => score >= b.floor && score <= b.ceiling)
  if (!band) throw new Error(`No risk band holds score ${score}`)
  return band
}

export function lowerRiskBand(band: ProfileBand): ProfileBand | undefined {
  const i = RISK_PROFILE_TABLE.findIndex((b) => b.profile === band.profile)
  return i > 0 ? RISK_PROFILE_TABLE[i - 1] : undefined
}
