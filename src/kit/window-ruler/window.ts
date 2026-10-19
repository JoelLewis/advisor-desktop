import { fmtDate } from '@/kit/measure'

const DAY = 86_400_000

const utcMidnight = (iso: string) => Date.parse(`${fmtDate(iso)}T00:00:00Z`)

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcMidnight(toIso) - utcMidnight(fromIso)) / DAY)
}
