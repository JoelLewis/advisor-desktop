const easternDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })

/** The New York calendar day of an instant ("2026-02-25"): the day the market and the advisor are in. */
export function easternDayOf(iso: string): string {
  const instant = Date.parse(iso)
  if (Number.isNaN(instant)) throw new Error(`Not an ISO instant: ${iso}`)
  return easternDate.format(new Date(instant))
}

const easternHour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' })

/** Whether an instant falls before noon in New York: the advisor's morning. */
export function isEasternMorning(iso: string): boolean {
  const instant = Date.parse(iso)
  if (Number.isNaN(instant)) throw new Error(`Not an ISO instant: ${iso}`)
  return Number(easternHour.format(new Date(instant))) < 12
}
