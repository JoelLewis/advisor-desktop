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
