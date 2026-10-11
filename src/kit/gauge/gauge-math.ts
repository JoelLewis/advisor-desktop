import { MeasureError } from '@/kit/measure'

const EPSILON = 1e-9

export function gaugeStatus(drift: number, band: number): 'OUT' | 'AT LIMIT' | 'IN' {
  const d = Math.abs(drift)
  if (d > band + EPSILON) return 'OUT'
  if (Math.abs(d - band) <= EPSILON) return 'AT LIMIT'
  return 'IN'
}

export function gaugeDomain(drift: number, band: number): number {
  if (!Number.isFinite(band) || band <= 0) throw new MeasureError(`tolerance band must be positive and finite, got ${String(band)}`)
  const multiples = Math.max(2, Math.ceil((Math.abs(drift) - EPSILON) / band))
  return multiples * band
}
