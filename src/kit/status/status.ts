export type Status = 'OUT' | 'AT LIMIT' | 'IN' | 'BLOCK' | 'WARN' | 'CLEAR' | 'OPEN'
export type Glyph = 'filled' | 'outlined' | 'hollow'

const SIGNAL: ReadonlySet<Status> = new Set(['OUT', 'BLOCK'])
const OUTLINED: ReadonlySet<Status> = new Set(['WARN', 'AT LIMIT', 'OPEN'])

export function isSignal(status: Status): boolean {
  return SIGNAL.has(status)
}

export function glyphFor(status: Status): Glyph {
  if (SIGNAL.has(status)) return 'filled'
  return OUTLINED.has(status) ? 'outlined' : 'hollow'
}
