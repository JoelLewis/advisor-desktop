import type { MethodNote } from './reference'

export type BreakField = 'cash_balance' | 'position_quantity' | 'market_value' | 'transaction_count'
export const BREAK_RESOLUTIONS = ['book_corrected', 'custodian_corrected', 'timing_difference'] as const
export type BreakResolution = (typeof BREAK_RESOLUTIONS)[number]
export const isBreakResolution = (value: unknown): value is BreakResolution =>
  typeof value === 'string' && (BREAK_RESOLUTIONS as readonly string[]).includes(value)
export const RESOLUTION_WORDS: Readonly<Record<BreakResolution, string>> = {
  book_corrected: 'Book corrected', custodian_corrected: 'Custodian corrected', timing_difference: 'Timing difference',
}

export type BreakUnit = 'USD' | 'sh' | 'count'
export type MatchKind = 'positions' | 'cash' | 'transactions'
export type IntegrationStatus = 'synced' | 'pending' | 'failed'

/** A break as recorded: the custodian's figure minus the book's. The book's side is read off the book. */
export type ReconBreakRecord = {
  id: string; accountId: string; field: BreakField; symbol?: string; custodianDelta: number; severity: 'low' | 'medium' | 'high'
  detectedAt: string
  /** Seeded history: when it was resolved, before this session. */
  resolvedBeforeSession?: string
}
export type IntegrationLogEntry = { integration: string; at: string; status: IntegrationStatus; detail: string }

export type ReconBreakView = {
  id: string; custodian: string; accountId: string; accountName: string; field: BreakField; fieldLabel: string; symbol?: string; unit: BreakUnit
  book: number; custodianValue: number; difference: number; severity: 'low' | 'medium' | 'high'; detectedAt: string; fingerprint: string
  status: 'open' | 'resolved'; resolvedAt?: string
  /** The binding act that resolved it in this session. */
  resolution?: { actId: string; actorName: string; resolution: BreakResolution; rationale: string }
}
export type MatchRate = { kind: MatchKind; checked: number; open: number; rate: number }
export type IntegrationView = { name: string; kind: 'custodian' | 'planning'; status: IntegrationStatus; lastSync?: string; openBreaks: number; log: IntegrationLogEntry[] }
export type ReconTrendPoint = { date: string; openBreaks: number; positions: number; cash: number; transactions: number }
export type ReconciliationView = {
  asOf: string
  summary: { openBreaks: number; resolvedToday: number; rates: MatchRate[] }
  breaks: ReconBreakView[]
  integrations: IntegrationView[]
  trend: ReconTrendPoint[]
  methods: MethodNote[]
}
export type ResolveBreakRequest = { breakId: string; fingerprint: string; resolution: BreakResolution; rationale: string }
