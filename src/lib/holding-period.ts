/**
 * IRC §1222: a gain is long-term when the asset was held more than one year, i.e. sold (or valued) after
 * the anniversary of its acquisition. Dates are `YYYY-MM-DD`.
 */
export function holdingPeriodOn(acquired: string, day: string): 'short' | 'long' {
  const start = new Date(`${acquired}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== acquired) throw new Error(`Not a date: ${acquired}`)
  const anniversary = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate())).toISOString().slice(0, 10)
  return day > anniversary ? 'long' : 'short'
}
