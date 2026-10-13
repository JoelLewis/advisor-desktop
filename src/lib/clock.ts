/**
 * The single frozen clock for this demo. Every "today" in the product resolves here.
 *
 * D20 · data-quality — the dashboard greeting previously used the live system clock while all
 * fixture data was frozen in February, producing a five-month gap on the landing screen.
 * D19 · data-quality — reconciliation was dated 2026-02-27, ahead of the data it reconciles.
 */
export const MOCK_NOW_ISO = '2026-02-25T12:00:00Z' as const
export const MOCK_TODAY_ISO = '2026-02-25' as const

export function now(): Date {
  return new Date(MOCK_NOW_ISO)
}

export function todayISO(): string {
  return MOCK_TODAY_ISO
}

export function startOfToday(): Date {
  return new Date(`${MOCK_TODAY_ISO}T00:00:00Z`)
}

/** Deterministic event clock: the frozen now plus `sequence` minutes. Recorded acts take successive sequences. */
export function eventTime(sequence: number): string {
  return new Date(Date.parse(MOCK_NOW_ISO) + sequence * 60_000).toISOString()
}

/** The event-clock sequence (minutes after the frozen now) of an instant. */
export function minuteOf(iso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(MOCK_NOW_ISO)) / 60_000)
}
