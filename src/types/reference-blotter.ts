import type { CurrencyCode } from './currency'
import type { MethodNote } from './reference'

export const BLOTTER_STATUSES = ['working', 'pending_compliance', 'filled', 'canceled', 'withdrawn', 'returned'] as const
export type BlotterStatus = (typeof BLOTTER_STATUSES)[number]
export const isBlotterStatus = (value: unknown): value is BlotterStatus => typeof value === 'string' && (BLOTTER_STATUSES as readonly string[]).includes(value)

type BlotterSource = { kind: 'ticket' } | { kind: 'proposal'; proposalId: string; title: string; version: number; threadId: string }
export type BlotterRow = {
  id: string; accountId: string; accountName: string; symbol: string; side: 'buy' | 'sell'
  /** Shares, option contracts, or a bond's par amount in USD, as `quantityUnit` says. */
  quantity: number; quantityUnit: 'sh' | 'contracts' | 'par'
  /** The fill price once filled; a working limit order's limit. */
  price?: number; priceKind?: 'fill' | 'limit'
  value?: number; currency: CurrencyCode; status: BlotterStatus; source: BlotterSource
  /** The record that closed the order, else the approval it was staged from. Tickets have none. */
  recId?: string
  submittedAt: string; filledAt?: string
  /** Submitted on a trading day before the 9:30 ET open, so queued for it. */
  preMarket?: true
}
export type BlotterFilters = { status?: BlotterStatus; accountId?: string; since?: string; until?: string }
export type BlotterView = { asOf: string; filters: BlotterFilters; rows: BlotterRow[]; accounts: { id: string; name: string }[]; days: string[]; methods: MethodNote[] }
