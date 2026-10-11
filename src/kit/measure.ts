export const MINUS = '−'
export const UNIT = { usd: 'USD', pp: 'pp', pct: '%', shares: 'sh', days: 'd' } as const

const cache = new Map<string, Intl.NumberFormat>()
function numberFormat(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max })
    cache.set(key, f)
  }
  return f
}

function rounded(v: number, digits: number): number {
  const r = Number(v.toFixed(digits))
  return Object.is(r, -0) ? 0 : r
}

function unsigned(v: number, min: number, max: number): string {
  const r = rounded(v, max)
  const text = numberFormat(min, max).format(Math.abs(r))
  return r < 0 ? `${MINUS}${text}` : text
}

function signed(v: number, min: number, max: number): string {
  const r = rounded(v, max)
  const text = numberFormat(min, max).format(Math.abs(r))
  if (r > 0) return `+${text}`
  if (r < 0) return `${MINUS}${text}`
  return text
}

export function normaliseMinus(s: string): string {
  return s.replace(/(^|[\s(])-(?=\d)/g, `$1${MINUS}`)
}

export function isNegative(formatted: string): boolean {
  return formatted.startsWith(MINUS)
}

export const fmtMoney = (v: number) => unsigned(v, 0, 0)
export const fmtResult = (v: number) => signed(v, 0, 0)
export const fmtPrice = (v: number) => unsigned(v, 2, 2)
export const fmtWeight = (fraction: number) => unsigned(Math.abs(fraction) * 100, 1, 1)
export const fmtReturn = (fraction: number) => signed(fraction * 100, 1, 1)
export const fmtDrift = (fraction: number) => signed(fraction * 100, 1, 1)
export const fmtTolerance = (fraction: number) => `±${unsigned(Math.abs(fraction) * 100, 1, 1)}`
export const fmtQuantity = (v: number) => unsigned(v, 0, 3)
export const fmtDays = (n: number) => unsigned(n, 0, 0)
export const fmtScore = (fraction: number) => unsigned(fraction * 100, 0, 0)

export function splitFraction(formatted: string): { whole: string; fraction: string } {
  const dot = formatted.indexOf('.')
  return dot < 0 ? { whole: formatted, fraction: '' } : { whole: formatted.slice(0, dot), fraction: formatted.slice(dot) }
}

export function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

export function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`
}

export function clientMoney(v: number): string {
  const r = rounded(v, 0)
  const text = `$${numberFormat(0, 0).format(Math.abs(r))}`
  return r < 0 ? `${MINUS}${text}` : text
}

export function clientPercent(fraction: number): string {
  return `${unsigned(fraction * 100, 1, 1)}%`
}

const clientDates = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function clientDate(iso: string): string {
  return clientDates.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}
