import { RISK_PROFILE_TABLE } from '@/lib/risk-profile'
import { modelVolatility } from './models'

type Anchor = { vol: number; score: number }

/** (0, 0), each band's model σ at the band's midpoint score, and twice the riskiest model's σ at 100 (R10). */
function anchors(): Anchor[] {
  const bands = RISK_PROFILE_TABLE.map((b) => ({ vol: modelVolatility(b.modelId), score: (b.floor + b.ceiling) / 2 }))
  const top = bands[bands.length - 1]
  if (!top) throw new Error('The risk-profile table is empty')
  const points = [{ vol: 0, score: 0 }, ...bands, { vol: top.vol * 2, score: 100 }]
  points.forEach((p, i) => {
    const prev = points[i - 1]
    if (prev && p.vol <= prev.vol) throw new Error('Each band in the risk-profile table must name a riskier model than the band below it')
  })
  return points
}

/** A volatility on the questionnaire's 0–100 scale, rounded to whole points like the questionnaire. */
export function riskScoreOf(vol: number): number {
  const points = anchors()
  const i = points.findIndex((p) => p.vol > vol)
  const [a, b] = [points[i - 1], points[i]]
  if (i < 0 || !a || !b) return 100
  return Math.round(a.score + ((vol - a.vol) / (b.vol - a.vol)) * (b.score - a.score))
}
