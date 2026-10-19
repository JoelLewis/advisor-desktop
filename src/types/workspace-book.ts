/** Why a household needs the advisor today, in the order the queue ranks them. */
export const QUEUE_TIERS = ['decision', 'client_waiting', 'meeting', 'compliance', 'task'] as const
/**
 * One reason, as data the UI words: decisions waiting (unapproved proposals, suitability reasons due) since the
 * oldest; a client waiting for a reply since their first unanswered message; a meeting today still to hold; open
 * compliance items since the oldest; tasks due today or overdue, by the earliest due date.
 */
export type QueueReason =
  | { kind: 'decision'; count: number; since: string }
  | { kind: 'client_waiting'; clientName: string; since: string; threadId: string }
  | { kind: 'meeting'; label: string; start: string; eventId: string }
  | { kind: 'compliance'; count: number; since: string }
  | { kind: 'task'; count: number; due: string; overdue: boolean }
/** Small text markers: any model account outside its band, open compliance items, open tasks and items. */
export type HouseholdMarkers = { outOfBand: boolean; compliance: number; tasks: number }
/** `managedValue` is in USD. `reasons` is empty for a household with nothing due today. */
export type HouseholdRow = { householdId: string; name: string; managedValue: number; reasons: QueueReason[]; markers: HouseholdMarkers }
/** The advisor's book: the queue (rows with a reason, ranked) and every household A–Z. */
export type HouseholdBook = { asOf: string; queue: HouseholdRow[]; households: HouseholdRow[] }
