export const MINUS = '−'
export const UNIT = { usd: 'USD', pp: 'pp', pct: '%', shares: 'sh', contracts: 'contracts', par: 'par', days: 'd', points: 'pts', bps: 'bps' } as const

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

export function isNegative(formatted: string): boolean {
  return formatted.startsWith(MINUS)
}

export const fmtMoney = (v: number) => unsigned(v, 0, 0)
export const fmtResult = (v: number) => signed(v, 0, 0)
export const fmtPrice = (v: number) => unsigned(v, 2, 2)
export const fmtWeight = (fraction: number) => unsigned(fraction, 1, 1, 2)
export const fmtReturn = (fraction: number) => signed(fraction, 1, 1, 2)
export const fmtDrift = (fraction: number) => signed(fraction, 1, 1, 2)

/** A drift in the tenths of a point `fmtDrift` shows: −0.07449 → −74. */
function driftTenths(fraction: number): number {
  assertFinite(fraction)
  const tenths = Number(numberFormat(1, 1).format(shift(Math.abs(fraction), 2)).replace(/[,.]/g, ''))
  return fraction < 0 ? -tenths : tenths
}

/** The change between two drifts as they are shown, so before, after and the change agree on screen: −7.4 → −5.4 is +2.0. */
export function driftChange(before: number, after: number): number {
  return shift(driftTenths(after) - driftTenths(before), -3)
}

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

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

/** A bare `YYYY-MM-DD`: a day, not a moment. It has no time and no zone, so it is never read as midnight UTC. */
export const isCalendarDate = (iso: string): boolean => CALENDAR_DATE.test(iso)

function parseInstant(iso: string): Date {
  if (isCalendarDate(iso)) throw new MeasureError(`expected a moment with its offset, got the calendar date ${iso}; a date is formatted as a date`)
  return parseIso(iso)
}

/** The record slip's books-and-records time, labeled UTC: "2026-02-25 12:00 UTC". Only the record slip shows it. */
export function fmtUtcStamp(iso: string): string {
  const utc = parseIso(iso).toISOString()
  return `${utc.slice(0, 10)} ${utc.slice(11, 16)} UTC`
}

const easternClock = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' })

/** A time as the calendar states it, in New York: "14:00". The instant must state its offset. */
export function fmtEasternTime(iso: string): string {
  return easternClock.format(parseInstant(iso))
}

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const monthAbbreviation = (month: number): string => {
  const word = MONTH_ABBREVIATIONS[month - 1]
  if (!word) throw new Error(`No month ${month}`)
  return word
}

const easternDayParts = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'America/New_York' })
const partOf = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string => {
  const part = parts.find((p) => p.type === type)
  if (!part) throw new Error(`The New York day has no ${type}`)
  return part.value
}

/** A moment's New York day, with its weekday: "Thu 26 Feb". */
export function fmtEasternDay(iso: string): string {
  const parts = easternDayParts.formatToParts(parseInstant(iso))
  return `${partOf(parts, 'weekday')} ${partOf(parts, 'day')} ${monthAbbreviation(Number(partOf(parts, 'month')))}`
}

/** A moment on the story's clock as its control names it: "Thu 26 Feb 09:10 ET". */
export function fmtEasternDayTime(iso: string): string {
  return `${fmtEasternDay(iso)} ${fmtEasternTime(iso)} ET`
}

const easternStampParts = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York',
})

function easternParts(iso: string): { dayKey: string; year: string; day: string; month: number; time: string } {
  const parts = easternStampParts.formatToParts(parseInstant(iso))
  const [year, month, day] = [partOf(parts, 'year'), Number(partOf(parts, 'month')), partOf(parts, 'day')]
  return { dayKey: `${year}-${month}-${day}`, year, day, month, time: `${partOf(parts, 'hour')}:${partOf(parts, 'minute')}` }
}

/**
 * A moment as people here read it, in New York time with the zone: "25 Feb 07:00 ET". Given `sameDayAs`,
 * a moment on that New York day drops its date: "07:00 ET". Deterministic in any machine zone; DST from the IANA zone.
 * A calendar date is refused: it has no time to state (`fmtDayMonthYear` or `fmtAsOf` say it as a date).
 */
export function fmtEasternStamp(iso: string, sameDayAs?: string): string {
  const at = easternParts(iso)
  if (sameDayAs !== undefined && easternParts(sameDayAs).dayKey === at.dayKey) return `${at.time} ET`
  return `${at.day} ${monthAbbreviation(at.month)} ${at.time} ET`
}

/** A meeting's window in New York time, with the zone: "14:00–15:15 ET". */
export function fmtEasternRange(start: string, end: string): string {
  return `${fmtEasternTime(start)}–${fmtEasternTime(end)} ET`
}

/** A window on the story's clock: "14:00–15:15 ET" on the compared New York day, "25 Feb 14:00–15:15 ET" on any other. */
export function fmtEasternWindow(start: string, end: string, sameDayAs?: string): string {
  const from = fmtEasternStamp(start, sameDayAs).replace(/ ET$/, '')
  return `${from}–${fmtEasternTime(end)} ET`
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

/**
 * A day as people here read it: "25 Feb 2026". A calendar date is that date in any machine zone; a moment is its
 * New York day, the day its ET stamp names.
 */
export function fmtDayMonthYear(iso: string): string {
  if (isCalendarDate(iso)) {
    const d = parseIso(iso)
    return `${d.getUTCDate()} ${monthAbbreviation(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`
  }
  const at = easternParts(iso)
  return `${at.day} ${monthAbbreviation(at.month)} ${at.year}`
}

/** When a source is as of: a calendar date as the date it states ("1 Dec 2025"), a moment as its ET stamp ("25 Feb 07:00 ET"). */
export function fmtAsOf(iso: string): string {
  return isCalendarDate(iso) ? fmtDayMonthYear(iso) : fmtEasternStamp(iso)
}

/** A calendar year, as a year reads: "2031", never "2,031". */
export function fmtYear(year: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) throw new MeasureError(`not a calendar year: ${year}`)
  return String(year)
}
