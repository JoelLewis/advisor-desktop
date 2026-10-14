export const MINUS = '−'
export const UNIT = { usd: 'USD', pp: 'pp', pct: '%', shares: 'sh', days: 'd', points: 'pts', bps: 'bps' } as const

export class MeasureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MeasureError'
  }
}

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

function assertFinite(v: number): void {
  if (!Number.isFinite(v)) throw new MeasureError(`expected a finite number, got ${String(v)}`)
}

// Intl rounds the decimal value (ECMA-402 halfExpand), so no toFixed pre-rounding.
// A value that formats to zero never carries a sign.
function sign(v: number, text: string, plus: boolean): string {
  if (!/[1-9]/.test(text)) return text
  if (v < 0) return `${MINUS}${text}`
  return plus && v > 0 ? `+${text}` : text
}

// Multiplies by 10^places in decimal, so 0.0705 becomes 7.05 rather than 7.0499999...
function shift(v: number, places: number): number {
  const [mantissa, exponent] = v.toExponential().split('e')
  return Number(`${mantissa}e${Number(exponent) + places}`)
}

function unsigned(v: number, min: number, max: number, places = 0): string {
  assertFinite(v)
  return sign(v, numberFormat(min, max).format(shift(Math.abs(v), places)), false)
}

function signed(v: number, min: number, max: number, places = 0): string {
  assertFinite(v)
  return sign(v, numberFormat(min, max).format(shift(Math.abs(v), places)), true)
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
export const fmtWeight = (fraction: number) => unsigned(fraction, 1, 1, 2)
export const fmtReturn = (fraction: number) => signed(fraction, 1, 1, 2)
export const fmtDrift = (fraction: number) => signed(fraction, 1, 1, 2)
export const fmtTolerance = (fraction: number) => `±${unsigned(Math.abs(fraction), 1, 1, 2)}`
export const fmtQuantity = (v: number) => unsigned(v, 0, 3)
export const fmtDays = (n: number) => unsigned(n, 0, 0)
export const fmtPoints = (n: number) => unsigned(n, 0, 0)
export const fmtScore = (fraction: number) => unsigned(fraction, 0, 0, 2)
/** A fee or rate in percent, two places: 0.0085 → "0.85". */
export const fmtRate = (fraction: number) => unsigned(fraction, 2, 2, 2)
/** A rate in basis points, one place: 0.0074387 → "74.4". */
export const fmtBasisPoints = (fraction: number) => unsigned(fraction, 1, 1, 4)
/** A ratio such as beta, two places. */
export const fmtRatio = (v: number) => unsigned(v, 2, 2)
/** A factor exposure, signed, two places. */
export const fmtExposure = (v: number) => signed(v, 2, 2)
/** An attribution effect in percentage points, signed, two places: 0.00123 → "+0.12". */
export const fmtEffect = (fraction: number) => signed(fraction, 2, 2, 2)

export function splitFraction(formatted: string): { whole: string; fraction: string } {
  const dot = formatted.indexOf('.')
  return dot < 0 ? { whole: formatted, fraction: '' } : { whole: formatted.slice(0, dot), fraction: formatted.slice(dot) }
}

// Accepts a calendar date, or a datetime that states its offset (Z or +/-HH:MM).
// Offset-less datetimes would be read as local time, so they are rejected.
const ISO = /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/

function parseIso(iso: string): Date {
  const match = ISO.exec(iso)
  if (!match) throw new MeasureError(`expected an ISO date or offset datetime, got ${iso}`)
  const [, year, month, day, time] = match
  const monthIndex = Number(month) - 1
  const calendar = new Date(Date.UTC(Number(year), monthIndex, Number(day)))
  if (calendar.getUTCMonth() !== monthIndex || calendar.getUTCDate() !== Number(day)) {
    throw new MeasureError(`not a real calendar date: ${iso}`)
  }
  const date = new Date(time ? iso : `${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new MeasureError(`not a valid time: ${iso}`)
  return date
}

export function fmtDate(iso: string): string {
  return parseIso(iso).toISOString().slice(0, 10)
}

export function fmtTimestamp(iso: string): string {
  const utc = parseIso(iso).toISOString()
  return `${utc.slice(0, 10)} ${utc.slice(11, 16)} UTC`
}

const easternClock = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' })

/** A time as the calendar states it, in New York: "14:00". The instant must state its offset. */
export function fmtEasternTime(iso: string): string {
  return easternClock.format(parseIso(iso))
}

const easternDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/New_York' })

/** A moment on the story's clock as its control names it: "Thu 26 Feb 09:10 ET". */
export function fmtEasternDayTime(iso: string): string {
  return `${easternDay.format(parseIso(iso)).replace(',', '')} ${fmtEasternTime(iso)} ET`
}

/** A meeting's window in New York time, with the zone: "14:00–15:15 ET". */
export function fmtEasternRange(start: string, end: string): string {
  return `${fmtEasternTime(start)}–${fmtEasternTime(end)} ET`
}

export function clientMoney(v: number): string {
  assertFinite(v)
  return sign(v, `$${numberFormat(0, 0).format(Math.abs(v))}`, false)
}

export function clientPercent(fraction: number): string {
  return `${unsigned(fraction, 1, 1, 2)}%`
}

/** A share in client copy where a whole percent reads naturally: "about 95%". */
export function clientWholePercent(fraction: number): string {
  return `${unsigned(fraction, 0, 0, 2)}%`
}

const clientDates = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function clientDate(iso: string): string {
  return clientDates.format(parseIso(iso))
}

/** A fee rate in client copy, to two places: "0.99%". */
export function clientRate(fraction: number): string {
  return `${unsigned(fraction, 2, 2, 2)}%`
}

const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
/** A date as the proposal's price line states it: "25 Feb 2026". */
export function fmtDayMonthYear(iso: string): string {
  return dayMonthYear.format(parseIso(iso))
}
