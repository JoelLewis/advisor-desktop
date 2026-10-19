import { MeasureError } from '@/kit/measure'

const EPSILON = 1e-9
export const MINOR_PER_BAND = 5

export function driftStatus(drift: number, band: number): 'OUT' | 'AT LIMIT' | 'IN' {
  const d = Math.abs(drift)
  if (d > band + EPSILON) return 'OUT'
  if (Math.abs(d - band) <= EPSILON) return 'AT LIMIT'
  return 'IN'
}

function assertPositive(what: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) throw new MeasureError(`${what} must be positive and finite, got ${String(v)}`)
}

export function gaugeDomain(drift: number, band: number): number {
  assertPositive('tolerance band', band)
  const multiples = Math.max(2, Math.ceil((Math.abs(drift) - EPSILON) / band))
  return multiples * band
}

export function sharedGaugeDomain(drifts: number[], band: number): number {
  return Math.max(gaugeDomain(0, band), ...drifts.map((d) => gaugeDomain(d, band)))
}

/** Tick values either side of target: majors at each band multiple, minors at each fifth of a band. */
export function gaugeTicks(domain: number, band: number): { major: number[]; minor: number[] } {
  assertPositive('gauge domain', domain)
  assertPositive('tolerance band', band)
  const steps = Math.floor(domain / (band / MINOR_PER_BAND) + EPSILON)
  const major: number[] = []
  const minor: number[] = []
  for (let i = -steps; i <= steps; i++) {
    if (i === 0) continue
    const value = (i * band) / MINOR_PER_BAND
    if (i % MINOR_PER_BAND === 0) major.push(value)
    else minor.push(value)
  }
  return { major, minor }
}
