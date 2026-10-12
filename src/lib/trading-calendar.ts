/**
 * The NYSE trading calendar for the years the fixtures reach (2022–2026): which days the exchange
 * trades, and when its regular session runs in UTC. A trade, a sale or a lot purchase in an
 * exchange-traded security happens on one of these days; a date outside the years covered is an
 * error, not a guess.
 */

/** Full-day NYSE closures, 2022–2026. Saturday holidays observed on the Friday are listed as the Friday. */
const NYSE_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2022 (New Year's Day fell on a Saturday and was not observed)
  '2022-01-17', '2022-02-21', '2022-04-15', '2022-05-30', '2022-06-20', '2022-07-04', '2022-09-05', '2022-11-24', '2022-12-26',
  // 2023
  '2023-01-02', '2023-01-16', '2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19', '2023-07-04', '2023-09-04', '2023-11-23', '2023-12-25',
  // 2024
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27', '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
  // 2025 (2025-01-09: national day of mourning for President Carter)
  '2025-01-01', '2025-01-09', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
  // 2026 (Presidents' Day 2026-02-16, Good Friday 2026-04-03, Independence Day observed 2026-07-03)
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
])

const FIRST_YEAR = 2022
const LAST_YEAR = 2026
const DAY_MS = 24 * 60 * 60 * 1000

function utcDate(iso: string): Date {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`not an ISO date: ${iso}`)
  const year = date.getUTCFullYear()
  if (year < FIRST_YEAR || year > LAST_YEAR) throw new Error(`the NYSE calendar covers ${FIRST_YEAR}–${LAST_YEAR}, not ${iso}`)
  return date
}

/** Whether the NYSE trades on the calendar date of `iso` (a date or a timestamp; its UTC date is read). */
export function isTradingDay(iso: string): boolean {
  const date = utcDate(iso)
  const weekday = date.getUTCDay()
  return weekday !== 0 && weekday !== 6 && !NYSE_HOLIDAYS.has(iso.slice(0, 10))
}

/** `iso` itself if the NYSE trades that day, else the last trading day before it. */
export function tradingDayOnOrBefore(iso: string): string {
  let date = utcDate(iso)
  while (!isTradingDay(date.toISOString())) date = new Date(date.getTime() - DAY_MS)
  return date.toISOString().slice(0, 10)
}

/** The nth Sunday of a month (0-based month), as a UTC date. */
function nthSunday(year: number, month: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1))
  return new Date(Date.UTC(year, month, 1 + ((7 - first.getUTCDay()) % 7) + (n - 1) * 7))
}

/**
 * The regular session (9:30–16:00 New York time) on the date of `iso`, in UTC: 14:30–21:00Z under
 * Eastern Standard Time, 13:30–20:00Z under daylight time (second Sunday of March to first Sunday
 * of November). A trading day's date is all the rule needs; the switch happens on a Sunday.
 */
export function nyseSessionUtc(iso: string): { open: string; close: string } {
  const date = utcDate(iso)
  const year = date.getUTCFullYear()
  const daylight = date >= nthSunday(year, 2, 2) && date < nthSunday(year, 10, 1)
  const day = iso.slice(0, 10)
  return daylight
    ? { open: `${day}T13:30:00.000Z`, close: `${day}T20:00:00.000Z` }
    : { open: `${day}T14:30:00.000Z`, close: `${day}T21:00:00.000Z` }
}

/** Whether the timestamp falls in the NYSE regular session of a trading day, open and close included. */
export function isDuringNyseSession(timestamp: string): boolean {
  if (!isTradingDay(timestamp)) return false
  const { open, close } = nyseSessionUtc(timestamp)
  const at = new Date(timestamp).getTime()
  return at >= Date.parse(open) && at <= Date.parse(close)
}
