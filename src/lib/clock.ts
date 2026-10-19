/**
 * The single frozen clock for this demo. Every "today" in the product resolves here, so no screen
 * reads the live system clock against a book frozen in February.
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
