import type { Citation, Figure, Subject } from './workspace'

/** The firm's reference views: dense reading that is not a conversation, each one step from a thread. */
export const REFERENCE_VIEWS = ['billing', 'reconciliation', 'risk', 'attribution', 'models', 'practice', 'blotter'] as const
export type ReferenceView = (typeof REFERENCE_VIEWS)[number]
export const isReferenceView = (value: unknown): value is ReferenceView =>
  typeof value === 'string' && (REFERENCE_VIEWS as readonly string[]).includes(value)

/** How a view's figures are computed. `modeled` marks an assumption or a synthetic series: modeled, not realized. */
export type MethodNote = { label: string; text: string; modeled: boolean }

/**
 * One row of a view as the engine quotes it into a team thread: what it is about, a claim with no figure
 * in it, and its figures with their sources. The engine computes it from the view and the row id alone.
 */
export type RowQuote = { view: ReferenceView; rowId: string; subject: Subject; threadTitle: string; claim: string; figures: Figure[]; citations: Citation[] }

/** Where a take landed: the thread (found or opened) and the card, new or already there. */
export type TakeResult = { threadId: string; threadTitle: string; messageId: string; created: boolean }
